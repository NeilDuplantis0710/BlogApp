import Redis from 'ioredis'

let redisClient

const connectRedis = async () => {
    if (redisClient) return redisClient

    const redisUrl = process.env.REDIS_URL

    if (!redisUrl) {
        throw new Error('REDIS_URL is not defined')
    }

    redisClient = new Redis(redisUrl, {
        lazyConnect: true,
        retryStrategy: () => null,
    })

    redisClient.on('error', (error) => {
        console.error('Redis error:', error)
    })

    try {
        await redisClient.connect()
        await redisClient.ping()
        console.log('Redis connected!!!')
        return redisClient
    } catch (error) {
        redisClient.disconnect()
        redisClient = undefined
        throw error
    }
}

const getRedisClient = () => {
    if (!redisClient) {
        throw new Error('Redis client is not connected')
    }

    return redisClient
}

const closeRedis = async () => {
    if (!redisClient) return

    const client = redisClient
    redisClient = undefined

    try {
        await client.quit()
        console.log('Redis connection closed.')
    } catch (error) {
        client.disconnect()
        console.error('Redis did not close gracefully:', error)
    }
}

export { connectRedis, getRedisClient, closeRedis }
