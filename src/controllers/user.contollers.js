import { asyncHandler } from "../utils/AyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { apiResponse } from "../utils/ApiResponse.js"
import { refine, toUpperCase } from "zod"
import { response } from "express"
import { User } from "../models/user.models.js"



// User Sign - Up
const userSignUp = asyncHandler((req, res) => {
    const { username, email, fullName, about, avatar } = req.body

    console.log("User-Name: ", username)
    console.log("Email: ", email)
    console.log("Full-Name: ", fullName)
    console.log("About: ", about)
    console.log("Avatar: ", avatar)

    if (!username || username == "") {
        throw new ApiError(400, "Username is required!!")
    }
    if (!email || email == "") {
        throw new ApiError(400, "Email is required!!")
    }
    if (!fullName || fullName == "") {
        throw new ApiError(400, "Full Name is required!!")
    }
    if (!about || about == "") {
        throw new ApiError(400, "Username is required!!")
    }
    if (!avatar || avatar == "") {
        throw new ApiError(400, "Avatar is required!!")
    }

})
export { }
