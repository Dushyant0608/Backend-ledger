const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware")
const accountController = require("../controllers/account.controller")

/**
 * - POST api/account/
 * - Create a new account 
 * - Protected Route
 */
/**
 * @swagger
 * /account:
 *   post:
 *     summary: Create a new bank account
 *     tags: [Account]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Account created successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/' , authMiddleware.authMiddleware , accountController.createAccountController );

/**
 * - GET api/account
 * - get all accounts of user
 * - protected route
 */

/**
 * @swagger
 * /account:
 *   get:
 *     summary: Get all accounts of logged in user
 *     tags: [Account]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user accounts
 */
router.get("/" , authMiddleware.authMiddleware , accountController.getAllUserAccounts);

/**
 * - GET api/account/balance/:accountId
 * - fecth balance
 * - protected route
 */

/**
 * @swagger
 * /account/balance/{accountId}:
 *   get:
 *     summary: Get balance of an account
 *     tags: [Account]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: string
 *         description: Account ID
 *     responses:
 *       200:
 *         description: Account balance returned
 *       404:
 *         description: Account not found
 */
router.get("/balance/:accountId" , authMiddleware.authMiddleware , accountController.getAccountBalance);



module.exports = router;