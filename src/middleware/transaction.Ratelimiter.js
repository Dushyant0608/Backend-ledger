const { transactionLimiter } = require('../config/redis');

const transactionRateLimiter = async (req, res, next) =>{
  try{
    await transactionLimiter.consume(`txn-${req.user.id}`);
    next();
  }catch(err){
    return res.status(429).json({
      message : "Too many transaction request. Please try again later."
    });
  }
};

module.exports = transactionRateLimiter;