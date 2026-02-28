const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware")
const accountController = require("../controllers/account.controller")

/**
 * - POST api/account/
 * - Create a new account 
 * - Protected Route
 */
router.post('/' , authMiddleware.authMiddleware , accountController.createAccountController );

/**
 * - GET api/account
 * - get all accounts of user
 * - protected route
 */
router.get("/" , authMiddleware.authMiddleware , accountController.getAllUserAccounts);

/**
 * - GET api/account/balance/:accountId
 * - fecth balance
 * - protected route
 */
router.get("/balance/:accountId" , authMiddleware.authMiddleware , accountController.getAccountBalance);



module.exports = router;