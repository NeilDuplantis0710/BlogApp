import { Router } from "express"
import { userSignUp } from "../controllers/user.contollers.js"
import { upload } from "../middleware/multer.middleware.js"

const router = Router() //Creating a router object.

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        }
    ]),
    userSignUp
)
export default router