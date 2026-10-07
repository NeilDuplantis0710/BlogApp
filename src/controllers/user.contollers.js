import { asyncHandler } from "../utils/AyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { apiResponse } from "../utils/ApiResponse.js"
import { User } from "../models/user.models.js"
import { Post } from "../models/post.models.js"
import jwt from "jsonwebtoken"


//Generating Access Token and Refresh Token

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)

        const { token: accessToken, jti: accessJti } = user.generateAccessToken()
        const { token: refreshToken, jti: refreshJti } = user.generateRefreshToken()

        await user.savedSessionToRedis('access', accessJti, process.env.ACCESS_TOKEN_EXPIRY)
        await user.savedSessionToRedis('refresh', refreshJti, process.env.REFRESH_TOKEN_EXPIRY)

        // Storing the raw refresh token inside the database.
        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating the access and refresh tokens!!")
    }
}

// User Sign - Up
const userSignUp = asyncHandler(async (req, res) => {
    const body = req.body ?? {}
    const { username, email, fullName, about, password } = body

    console.log("User-Name: ", username)
    console.log("Email: ", email)
    console.log("Full-Name: ", fullName)
    console.log("About: ", about)
    console.log("Password: ", password)

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
    if (!password || password == "") {
        throw new ApiError(400, "Password is required!!")
    }
    const alreadyExist = await User.findOne({
        $or: [{ username: username }, { email: email }]
    })
    if (alreadyExist) {
        throw new ApiError(409, "User already exist!!")
    }

    const user = await User.create({
        username: username.toUpperCase().trim(),
        email: email.trim(),
        fullName: fullName.trim(),
        about: about.toUpperCase(),
        password: password.trim()
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken -accessToken")

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while creating the user!!")
    }

    return res.status(201).json(new apiResponse(201, "User created successfully!!", createdUser))
})

// Get all users

const getAllUsers = asyncHandler(async (req, res) => {
    const users = await User.find({})
    return res.status(201).json(new apiResponse(201, users, "Users fetched successfully!!"))
})


// Blog Post
const writePost = asyncHandler(async (req, res) => {
    const body = req.body ?? {}
    const { postName, postAuthor, postSubContent, postTag, postContent } = body

    console.log("Post - Name: ", postName)
    console.log("Post - Author: ", postAuthor)
    console.log("Post - Subcontent: ", postSubContent)
    console.log("Post - Tag: ", postTag)
    console.log("Post - Content: ", postContent)

    if (Object.keys(body).length === 0) {
        throw new ApiError(400, "Request Body not found!!")
    }

    if (!postName || postName == '') {
        throw new ApiError(400, "Post Name is required!!!")
    }

    if (!postAuthor || postAuthor == '') {
        throw new ApiError(400, "Post Author is required!!!!")
    }

    if (!postTag || postTag == '') {
        throw new ApiError(400, 'Post Tag is required!!!')
    }

    if (!postContent || postContent == '') {
        throw new ApiError(400, 'Post Content is required!!!')
    }

    const author = await User.findOne({ fullName: postAuthor.trim() })

    if (!author) {
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

    if (!createdPost) {
        throw new ApiError(500, "The post can't be created!!!")
    }

    await req.app.locals.redis.del("blogs:all")

    return res.status(201).json(new apiResponse(201, "Post created Successfully!!!", createdPost))
})


// Get all blogs

const getAllBlogs = asyncHandler(async (req, res) => {

    const cacheKey = "blogs:all"
    const redis = req.app.locals.redis
    const cachedPosts = await redis.get(cacheKey)

    if (cachedPosts) { // Checking if our cache is empty or if it has something, give the output.
        return res.status(200).json(
            new apiResponse(200, JSON.parse(cachedPosts), "The posts from cache are here!!")
        )
    }

    const posts = await Post.find({})

    await redis.set(cacheKey, JSON.stringify(posts), "EX", 3600) // Storing the posts in redis cache through set with an TTL "EX" of 3600, 1 hour.

    return res.status(200).json( // If the redis cache is empty then gives the data from our database MongoDB
        new apiResponse(200, posts, "All the posts are here!!!")
    )
})

// Getting a particular post from the post ID.

const getAblog = asyncHandler(async (req, res) => {

    const cacheKey = `blog:${req.params.id}`
    const redis = req.app.locals.redis
    const cachedPost = await redis.get(cacheKey)

    if (cachedPost) {
        return res.status(200).json(
            new apiResponse(200, JSON.parse(cachedPost), "The Post you searched for is here!!!")
        )
    }

    const particularPost = await Post.findById(req.params.id)

    if (!particularPost) {
        throw new ApiError(404, "The Post you search does not exist!")
    }

    await redis.set(cacheKey, JSON.stringify(particularPost), "EX", 3600)

    return res.status(200).json(new apiResponse(200, particularPost, "The post you asked for is here!!!"))

})

//Login

const loginUser = asyncHandler(async (req, res) => {
    const body = req.body ?? {}

    const { email, password, username } = body

    if (!email && !username) {
        throw new ApiError(400, "Username or Email is required!!!")
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new ApiError(404, "User does not exist!!!")
    }

    const isPasswordCorrect = await user.isPasswordCorrect(password)

    if (!isPasswordCorrect) {
        throw new ApiError(401, "Password is incorrect!!!")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

    const accessTokenExpiryInMs = Number.parseInt(process.env.ACCESS_TOKEN_EXPIRY, 10) * 24 * 60 * 60 * 1000
    const refreshTokenExpiryInMs = Number.parseInt(process.env.REFRESH_TOKEN_EXPIRY, 10) * 24 * 60 * 60 * 1000

    res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: accessTokenExpiryInMs
    })

    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: refreshTokenExpiryInMs
    })

    return res.status(200).json(
        new apiResponse(200, {
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                about: user.about
            },
            accessToken,
            refreshToken
        }, "User logged in successfully!!")
    )
})

// User logout

// verifyJWT runs before this controller and adds the verified access-token jti
// and user to req. Logout uses the jti to revoke the access session, verifies
// the refresh token to revoke its session, then clears both cookies.
const logoutUser = asyncHandler(async (req, res) => {
    const redis = req.app.locals.redis
    const sessionKeys = [`session:access:${req.accessTokenJti}`]
    const refreshToken = req.cookies?.refreshToken

    if (refreshToken) {
        try {
            const decodedRefreshToken = jwt.verify(
                refreshToken,
                process.env.REFRESH_TOKEN_SECRET
            )

            if (
                decodedRefreshToken.type === "refresh" &&
                decodedRefreshToken.jti &&
                decodedRefreshToken._id === req.user._id.toString()
            ) {
                sessionKeys.push(`session:refresh:${decodedRefreshToken.jti}`)
            }
        } catch (error) {
            if (!(error instanceof jwt.JsonWebTokenError)) {
                throw error
            }
        }
    }

    await redis.del(...sessionKeys)

    // Deleting the refresh token from the database
    await User.updateOne(
        { _id: req.user._id },
        { $unset: { refreshToken: 1 } }
    )

    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict"
    }

    res.clearCookie("accessToken", cookieOptions)
    res.clearCookie("refreshToken", cookieOptions)

    return res.status(200).json(new apiResponse(200, {}, "User logged out successfully!!"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = await req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Refresh Token not found!!!!")
    }

    try {
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

    // Since now we have the decodedToken, this means that we have the access to the raw refresh token. Now in the user.models.js, because we have access to the raw refresh token, we also have the access to the payload used in jwt.sign and we can see that we have used ._id for jwt.sign.
    // Thus, we now also have the access to all the payload required by jwt.sign, this means that since we have access to the ._id, through which we can do a db lookup and get more info about the user.

    const user = await User.findById(decodedToken?._id)

    if (!user) {
        throw new ApiError(401, "Invalid refresh token!!!")
    }

    if (incomingRefreshToken !== user.refreshToken) {
        throw new ApiError(401, "Invalid or Expired Refresh Token!!!!")
    }

    await user.savedSessionToRedis('access', accessJti, process.env.ACCESS_TOKEN_EXPIRY)
    await user.savedSessionToRedis('refresh', refreshJti, process.env.REFRESH_TOKEN_EXPIRY)

    // Generating new access and refresh tokens

    const options = {
        httpOnly: true,
        secure: true
    }

    const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)

    return res
    .status(201)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", newRefreshToken, options)
    .json(
        new apiResponse(201, {accessToken, refreshToken: newRefreshToken}, "Access Token refreshed successfully!!!!!")
    )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token!!!")
    }
})

export { userSignUp, getAllUsers, writePost, getAllBlogs, getAblog, loginUser, logoutUser, refreshAccessToken }
