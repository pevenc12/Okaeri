const redis = require("redis")
const REDIS_OPTS = {}
const redis_client = redis.createClient(process.env.REDIS_PORT,
  process.env.REDIS_HOST, REDIS_OPTS)

module.exports = redis_client