import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.models.js"
import jwt from "jsonwebtoken"


export const verifyJWT = async (req, res, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")

        if (!token) {
            throw new ApiError(401, "Unauthorized request!!!")
        }

        const decodedTokenInfo = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

        if (decodedTokenInfo.type !== "access" || !decodedTokenInfo.jti) {
            throw new ApiError(401, "Invalid Access Token")
        }

        const redis = req.app.locals.redis
        const session = await redis.get(`session:access:${decodedTokenInfo.jti}`)

        if (!session) {
            throw new ApiError(401, "Access session has been revokeed!!!!")
        }

        const sessionData = JSON.parse(session)
        if (
            sessionData.tokenType !== "access" ||
            sessionData.jti !== decodedTokenInfo.jti ||
            sessionData.userId !== decodedTokenInfo._id
        ) {
            throw new ApiError(401, "Invalid Access Token")
        }

        const user = await User.findById(decodedTokenInfo?._id).select("-password -refreshToken")

        if (!user) {
            throw new ApiError(401, "Invalid Access Token")
        }

        req.user = user
        next()
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Acccess Token")
    }
}