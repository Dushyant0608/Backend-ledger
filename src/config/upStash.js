const {Ratelimit} = require("@upstash/ratelimit");
const {Redis} = require("@upstash/redis"); 

const dotenv = require("dotenv");
dotenv.config();

const redis = Redis.fromEnv();

const authLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"),
});

const transactionLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"),
});

const generalLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, "1 m"),
});

module.exports = {
    authLimiter,
    transactionLimiter,
    generalLimiter
}