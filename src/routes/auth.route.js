const express = require("express");
const router = express.Router();

const authController = require("../controllers/auth.controller");
const authRateLimiter = require("../middleware/auth.Ratelimiter");

/**
 * POST /api/auth/register
 */
router.post('/register' , authRateLimiter ,authController.userRegisterController);

/**
 * POST /api/auth/login
 */
router.post('/login' , authRateLimiter ,authController.userLoginController);

/**
 * POST /api/auth/logout
 */
router.post("/logout" , authController.userLogoutController);

module.exports = router;

