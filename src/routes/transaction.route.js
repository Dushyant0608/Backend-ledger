const express = require("express")

const authMiddleware = require("../middleware/auth.middleware")
const transactionController = require("../controllers/transaction.controller");

const router = express.Router();

/**
 * - POST api/transaction/
 * - create transaction
 */
router.post("/" , authMiddleware.authMiddleware , transactionController.createTransaction);

/**
 * - POST api/transaction/system/initial-fund
 * - Create initial fund transaction from system user
 */
router.post("/system/initial-fund" , authMiddleware.authSystemUserMiddleware , transactionController.createInitialFundTransaction);

module.exports = router;