const express = require("express")

const authMiddleware = require("../middleware/auth.middleware")
const transactionController = require("../controllers/transaction.controller");
const transactionRateLimiter = require("../middleware/transaction.Ratelimiter");

const router = express.Router();

/**
 * - POST api/transaction/
 * - create transaction
 */

/**
 * @swagger
 * /transaction:
 *   post:
 *     summary: Transfer money between accounts
 *     tags: [Transaction]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fromAccount
 *               - toAccount
 *               - amount
 *             properties:
 *               fromAccount:
 *                 type: string
 *                 example: 665f1a8e2a2f8d3f1c0a
 *               toAccount:
 *                 type: string
 *                 example: 665f1a8e2a2f8d3f1c0b
 *               amount:
 *                 type: number
 *                 example: 500
 *     responses:
 *       200:
 *         description: Transaction completed
 *       400:
 *         description: Transaction failed
 */
router.post("/" , authMiddleware.authMiddleware , transactionRateLimiter , transactionController.createTransaction);

/**
 * - POST api/transaction/system/initial-fund
 * - Create initial fund transaction from system user
 */

/**
 * @swagger
 * /transaction/system/initial-fund:
 *   post:
 *     summary: Add initial funds from system account
 *     tags: [Transaction]
 *     responses:
 *       200:
 *         description: Initial fund transaction completed
 *       400:
 *         description: Transaction failed
 */
router.post("/system/initial-fund" , authMiddleware.authSystemUserMiddleware , transactionController.createInitialFundTransaction);

module.exports = router;