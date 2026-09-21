import dotenv from 'dotenv'
import connectDB from './db/index.js'
import { app } from './app.js'
import { closeRedis, connectRedis } from './redis/index.js'

dotenv.config({ path: './.env' })

let server

const startServer = async () => {
    try {
        await connectDB()
        const redisClient = await connectRedis()
        app.locals.redis = redisClient

        server = app.listen(process.env.PORT || 5000, () => {
            console.log(`The server is up and running at port ${process.env.PORT || 5000}`)
        })
    } catch (error) {
        console.error('Failed to start the server:', error)
        process.exit(1)
    }
}

const shutdown = async (signal) => {
    console.log(`${signal} received. Closing connections...`)

    try {
        if (server) {
            await new Promise((resolve, reject) => {
                server.close((error) => error ? reject(error) : resolve())
            })
        }

        await closeRedis()
        process.exit(0)
    } catch (error) {
        console.error('Shutdown failed:', error)
        process.exit(1)
    }
}

process.once('SIGINT', () => shutdown('SIGINT'))
process.once('SIGTERM', () => shutdown('SIGTERM'))

startServer()
