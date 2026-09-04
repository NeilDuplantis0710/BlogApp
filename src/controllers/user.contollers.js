import { asyncHandler } from "../utils/AyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { apiResponse } from "../utils/ApiResponse.js"
import { refine, toUpperCase } from "zod"
import { response } from "express"
import { User } from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/Cloudinary.js"



// User Sign - Up
const userSignUp = asyncHandler(async (req, res) => {
    const { username, email, fullName, about, avatar: avatarBody } = req.body

    console.log("User-Name: ", username)
    console.log("Email: ", email)
    console.log("Full-Name: ", fullName)
    console.log("About: ", about)
    console.log("Avatar: ", avatarBody)

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
        throw new ApiError(400, "About is required!!")
    }
    if (!avatarBody || avatarBody == "") {
        throw new ApiError(400, "Avatar is required!!")
    }

    const alreadyExist = await User.findOne({
        $or: [{username: username}, {email: email}]
    })

    if(alreadyExist){
        throw new ApiError(409, "User already exist!!")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path

    if(!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required!!")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar){
        throw new ApiError(500, "Avatar is not uploaded successfully!!")
    }

    const user = await User.create({
        username: username.toUpperCase().trim(),
        email: email.trim(),
        fullName: fullName.trim(),
        about: about.toUpperCase(),
        avatar: (avatar && avatar.url) || avatarBody || ""
    })

    const createdUser = await User.findById(user._id)

    if(!createdUser){
        throw new ApiError(500, "Something went wrong while creating the user!!")
    }

    return res.status(201).json(new apiResponse(201, "User created successfully!!", createdUser))
})
export {userSignUp}
