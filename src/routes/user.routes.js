import { Router } from "express"
import { userSignUp, getAllUsers, writePost, getAllBlogs, getAblog, loginUser, logoutUser } from "../controllers/user.contollers.js"
import { verifyJWT } from "../middleware/auth.middleware.js"

const router = Router() //Creating a router object.

router.route("/register").post(userSignUp)
router.route("/getUsers").get(getAllUsers)
router.route("/writePost").post(writePost)
router.route("/getPosts").get(getAllBlogs)
router.route("/getBlog/:id").get(getAblog)
router.route("/login").post(loginUser)


// secured route

router.route("/logOut").post(verifyJWT, logoutUser)

export default router