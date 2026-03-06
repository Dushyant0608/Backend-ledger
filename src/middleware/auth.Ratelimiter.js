const { authLimiter } = require("../config/upStash");

const authRateLimiter = async (req, res, next) => {
  try {
    const identifier = req.ip;

    const { success } = await authLimiter.limit(`auth-${identifier}`);

    if (!success) {
      return res.status(429).json({
        message: "Too many authentication requests. Please try again later."
      });
    }

    next();
  } catch (error) {
    console.error("Rate Limiting Error");
    next(error);
  }
};

module.exports = authRateLimiter;