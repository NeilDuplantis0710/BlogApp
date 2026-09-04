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

//routes declaration
app.use("/api/v1/signUp", signUp)
app.use("/api/v1/users", getAllUsers) 


//https://localhost:8000/api/v1/signup/register
export { app }