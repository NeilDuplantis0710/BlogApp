import mongoose, { Schema } from 'mongoose'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { getRedisClient } from '../redis/index.js'

const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    fullName: {
        type: String,
        required: false
    },
    about: {
        type: String,
    },
    password: {
        type: String,
        required: true
    },
    refreshToken: {
        type: String
    }
}, { timestamps: true })

userSchema.pre("save", async function () {
    if (!this.isModified("password")) return
    this.password = await bcrypt.hash(this.password, 10)
})

// Custom method to compare Password

userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password)
}


// JWT Token Generation
userSchema.methods.generateAccessToken = function () {
    const jti = crypto.randomUUID()

    const token = jwt.sign({
        _id: this._id,
        email: this.email,
        username: this.username,
        fullName: this.fullName,
        jti,
        type: 'access'
    }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY
    })

    return { token, jti }
}

userSchema.methods.generateRefreshToken = function () {
    const jti = crypto.randomUUID()

    const token = jwt.sign({
        _id: this._id,
        jti,
        type: 'refresh'
    }, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY
    })

    return { token, jti }
}

userSchema.methods.savedSessionToRedis = async function (tokenType, jti, expiresInDays) {
    const redis = getRedisClient()
    const ttlInSeconds = Number.parseInt(expiresInDays, 10) * 24 * 60 * 60

    const sessionData = {
        userId: this._id.toString(),
        username: this.username,
        email: this.email,
        fullName: this.fullName,
        tokenType,
        jti,
        issuedAt: Date.now(),
    }

    await redis.set(
        `session:${tokenType}:${jti}`,
        JSON.stringify(sessionData),
        'EX',
        ttlInSeconds
    )
}


export const User = mongoose.model("User", userSchema)