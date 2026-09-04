import { Router } from "express"
import { userSignUp, getAllUsers } from "../controllers/user.contollers.js"

const router = Router() //Creating a router object.

router.route("/register").post(userSignUp)
router.route("/getUsers").get(getAllUsers)
export default router