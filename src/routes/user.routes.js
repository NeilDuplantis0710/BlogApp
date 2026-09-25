import { Router } from "express"
import { userSignUp, getAllUsers, writePost, getAllBlogs, getAblog } from "../controllers/user.contollers.js"

const router = Router() //Creating a router object.

router.route("/register").post(userSignUp)
router.route("/getUsers").get(getAllUsers)
router.route("/writePost").post(writePost)
router.route("/getPosts").get(getAllBlogs)
router.route("/getBlog/:id").get(getAblog)

export default router