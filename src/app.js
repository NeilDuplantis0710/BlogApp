import express from 'express'
import cookieParser from 'cookie-parser'

const app = express()

app.use(express.json({ limit: '16kb' }))
app.use(express.urlencoded({ extended: true, limit: '16kb' }))
app.use(express.static('public'))
app.use(cookieParser())


//routes import

import signUp from './routes/user.routes.js'
import getAllUsers from './routes/user.routes.js'
import writePost from './routes/user.routes.js'
import getAllBlogs  from './routes/user.routes.js'
import getAblog  from './routes/user.routes.js'
import loginUser from './routes/user.routes.js'
import { logoutUser } from './controllers/user.contollers.js'
import { verifyJWT } from './middleware/auth.middleware.js'

//routes declaration
app.use("/api/v1/signUp", signUp)
app.use("/api/v1/users", getAllUsers) 
app.use("/api/v1/create", writePost)
app.use("/api/v1/blogs", getAllBlogs, getAblog)
app.use("/api/v1/loginUser", loginUser)
app.post("/api/v1/logout", verifyJWT, logoutUser)


//https://localhost:8000/api/v1/signup/register
export { app }