import { Router } from "express"
import { userSignUp } from "../controllers/user.contollers.js"

const router = Router() //Creating a router object.

router.route("/register").post(userSignUp)
export default router