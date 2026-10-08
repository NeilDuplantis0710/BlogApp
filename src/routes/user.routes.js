import { Router } from "express"
import { userSignUp, getAllUsers, writePost, getAllBlogs, getAblog, loginUser, logoutUser, refreshAccessToken, commentPost } from "../controllers/user.contollers.js"
import { verifyJWT } from "../middleware/auth.middleware.js"

const router = Router() //Creating a router object.

router.route("/register").post(userSignUp)
router.route("/getUsers").get(getAllUsers)
router.route("/writePost").post(writePost)
router.route("/getPosts").get(getAllBlogs)
router.route("/getBlog/:id").get(getAblog)
router.route("/login").post(loginUser)
router.route("/writeComment/:postId/:userId").post(commentPost)


// secured route

router.route("/logOut").post(verifyJWT, logoutUser)
router.route("/refresh-token").post(refreshAccessToken)

export default router