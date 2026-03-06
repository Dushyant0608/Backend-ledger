const { transactionLimiter } = require("../config/upStash");

const transactionRateLimiter = async (req, res, next) => {
  try {
    const identifier = req.user.id;

    const { success } = await transactionLimiter.limit(`txn-${identifier}`);

    if (!success) {
      return res.status(429).json({
        message: "Too many transactions. Please try again later."
      });
    }

    next();
  } catch (error) {
    console.error("Rate Limiting Error");
    next(error);
  }
};

module.exports = transactionRateLimiter;