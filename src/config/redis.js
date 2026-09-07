const Redis = require("ioredis");
const {RateLimiterRedis, RateLimiterMemory} = require("rate-limiter-flexible");

let redisClient;

if (process.env.REDIS_URL) {
  // Render / production: use REDIS_URL (includes TLS if rediss://)
  redisClient = new Redis(process.env.REDIS_URL, {
    tls: process.env.REDIS_URL.startsWith("rediss://") ? { rejectUnauthorized: false } : undefined,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 5) return null; // stop retrying after 5 attempts
      return Math.min(times * 200, 2000);
    },
  });
} else {
  // Local dev: use host/port
  redisClient = new Redis({
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: process.env.REDIS_PORT || 6379,
    enableOfflineQueue: false,
  });
}

redisClient.on("connect", () => {
  console.log("Redis is connected");
});

redisClient.on("error", (err) => {
  console.log("Redis error: ", err.message);
});

// Fallback to in-memory rate limiting if Redis is unavailable
let authLimiter;
let transactionLimiter;

try {
  authLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    prefix: "auth",
    points: 10,
    duration: 60,
  });

  transactionLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    prefix: "transaction",
    points: 20,
    duration: 60,
  });
} catch (err) {
  console.warn("Redis rate limiter failed, falling back to in-memory:", err.message);
  authLimiter = new RateLimiterMemory({ points: 10, duration: 60 });
  transactionLimiter = new RateLimiterMemory({ points: 20, duration: 60 });
}

module.exports = { authLimiter, transactionLimiter, redisClient };