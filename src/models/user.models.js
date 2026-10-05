import mongoose, { Schema } from 'mongoose'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
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

userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next()
    this.password = await bcrypt.hash(this.password, 10)
    next()
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


const savedSessionToRedis = async (user, tokenType, jti, expiresIn) => {
    const redis = getRedisClient()

    const sessionData = {
        userId: user._id.toString(),
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        tokenType,
        jti,
        issuedAt: Date.now(),
    }

    await redis.set(
        `session:${tokenType}:${jti}`,
        JSON.stringify(sessionData),
        'EX',
        expiresIn
    )
}

export const User = mongoose.model("User", userSchema)