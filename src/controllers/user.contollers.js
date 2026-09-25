import { asyncHandler } from "../utils/AyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { apiResponse } from "../utils/ApiResponse.js"
import { User } from "../models/user.models.js"
import { Post } from "../models/post.models.js"
import { application } from "express"



// User Sign - Up
const userSignUp = asyncHandler(async (req, res) => {
    const body = req.body ?? {}
    const { username, email, fullName, about } = body

    console.log("User-Name: ", username)
    console.log("Email: ", email)
    console.log("Full-Name: ", fullName)
    console.log("About: ", about)

    if (!req.body || Object.keys(req.body).length === 0) {
        throw new ApiError(400, "Request body is required!!")
    }
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

    const alreadyExist = await User.findOne({
        $or: [{username: username}, {email: email}]
    })

    if(alreadyExist){
        throw new ApiError(409, "User already exist!!")
    }
    const user = await User.create({
        username: username.toUpperCase().trim(),
        email: email.trim(),
        fullName: fullName.trim(),
        about: about.toUpperCase()
    })

    const createdUser = await User.findById(user._id)

    if(!createdUser){
        throw new ApiError(500, "Something went wrong while creating the user!!")
    }

    return res.status(201).json(new apiResponse(201,"User created successfully!!", createdUser))
})

// Get all users

const getAllUsers = asyncHandler(async (req,res) => {
    const users = await User.find({})
    return res.status(201).json(new apiResponse(201, users, "Users fetched successfully!!"))
})


// Blog Post
const writePost = asyncHandler(async(req,res) => {
    const body = req.body ?? {}
    const { postName, postAuthor, postSubContent, postTag, postContent} = body

    console.log("Post - Name: ", postName)
    console.log("Post - Author: ", postAuthor)
    console.log("Post - Subcontent: ", postSubContent)
    console.log("Post - Tag: ", postTag)
    console.log("Post - Content: ", postContent)

    if(Object.keys(body).length === 0){
        throw new ApiError(400, "Request Body not found!!")
    }

    if(!postName || postName == ''){
        throw new ApiError(400, "Post Name is required!!!")
    }

    if(!postAuthor || postAuthor == ''){
        throw new ApiError(400, "Post Author is required!!!!")
    }

    if(!postTag || postTag == ''){
        throw new ApiError(400, 'Post Tag is required!!!')
    }

    if(!postContent || postContent == ''){
        throw new ApiError(400, 'Post Content is required!!!')
    }

    const author = await User.findOne({ fullName: postAuthor.trim() })

    if(!author){
        throw new ApiError(404, "Post author not found")
    }

    const post = await Post.create({
        postName: postName.trim().toLowerCase(),
        postAuthor: author._id,
        postContent: postContent.toLowerCase(),
        postSubContent: postSubContent?.toLowerCase(),
        postTag: postTag.trim().toUpperCase(),
    }) 

    const createdPost = await Post.findById(post._id)

    if(!createdPost){
        throw new ApiError(500, "The post can't be created!!!")
    }

    return res.status(201).json(new apiResponse(201, "Post created Successfully!!!", createdPost))
})


// Get all blogs

const getAllBlogs = asyncHandler(async (req,res) => {
    const posts = await Post.find({})
    return res.status(201).json(new apiResponse(201, "All the posts are here!!!", posts))
})

// Getting a particular post from the post ID.

const getAblog = asyncHandler(async (req,res) => {
    const particularPost = Post.findById(Post._id)

    if(!particularPost){
        throw new ApiError(404, "The Post you search does not exist!")
    }

    return res.status(201).json(new apiResponse(201, "The post you asked for is here!!!", particularPost))

})

export {userSignUp, getAllUsers, writePost, getAllBlogs, getAblog}
