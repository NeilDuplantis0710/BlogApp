import Redis from 'ioredis'

const connectRedis = async () => {
    const redisUrl = process.env.REDIS_URL

    if(!redisUrl){
        throw new Error("REDIS_URL is not defined")
    }

    const redis = new Redis(redisUrl, {
        lazyConnect: true, // Create the Redis client, but do not connect yet, his line only prepares Redis. The actual connection happens later.
        retryStrategy: () => null, // This means if Redis cannot connect, do not keep retrying forever, stop and report the error.
    })

    await redis.connect()
    await redis.ping()

    console.log("Redis connected!!!")
    return redis
}

export { connectRedis }