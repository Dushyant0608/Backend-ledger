const prisma = require('../config/db');
const emailService = require("../services/email.service");


/**
 * - Create a new transaction
 * THE 10-STEP TRANSFER FLOW:
     * 1. Validate request
     * 2. Validate idempotency key
     * 3. Check account status
     * 4. Derive sender balance from ledger
     * 5. Create transaction (PENDING)
     * 6. Create DEBIT ledger entry
     * 7. Create CREDIT ledger entry
     * 8. Mark transaction COMPLETED
     * 9. Commit Prisma transaction
     * 10. Send email notification
 */

async function createTransaction (req , res ) {
    const {fromAccount , toAccount , amount , idempotencyKey} = req.body;
    /**
    * - 1. Validate request
    */
    if (!fromAccount || !toAccount || !amount || !idempotencyKey){
        return res.status(400).json({
            message : "FromAccount , ToAccount , Amount and IdempotencyKey are required to create a transaction"
        })
    }

    const fromUserAccount = await prisma.account.findUnique({ where : { id : fromAccount}});

    const toUserAccount = await prisma.account.findUnique({ where : { id : toAccount}});

    if(!fromUserAccount || !toUserAccount) {
        return res.status(400).json({
            message : "Invalid To or From account"
        })
    }

    /**
     * - 2. Validate idempotency key
     */
    const isTransactionAlreadyExists = await prisma.transaction.findUnique({ where : { idempotencyKey }});

    if (isTransactionAlreadyExists) {
        if (isTransactionAlreadyExists.status === "COMPLETED") {
            return res.status(200).json({
                message: "Transaction already processed",
                transaction: isTransactionAlreadyExists
            })

        }

        if (isTransactionAlreadyExists.status === "PENDING") {
            return res.status(200).json({
                message: "Transaction is still processing",
            })
        }

        if (isTransactionAlreadyExists.status === "FAILED") {
            return res.status(500).json({
                message: "Transaction processing failed, please retry"
            })
        }

        if (isTransactionAlreadyExists.status === "REVERSED") {
            return res.status(500).json({
                message: "Transaction was reversed, please retry"
            })
        }
    }

    /**
     * - 3. Check account status
     */
    if(fromUserAccount.status !== "ACTIVE" || toUserAccount.status !== "ACTIVE"){
        return res.status(400).json({
            message : "Both To and From accounts should be Active to process transaction"
        })
    }

    let transaction;

    try {
        await prisma.$transaction(async (tx) => {
            /**
             * - 4. SELECT FOR UPDATE (lock ordering to prevent deadlocks)
             *   Always lock the lower UUID first
             */
            const [firstId, secondId] = [fromAccount, toAccount].sort();

            await tx.$queryRaw`
                SELECT id FROM accounts WHERE id = ${firstId} FOR UPDATE
            `;
            await tx.$queryRaw`
                SELECT id FROM accounts WHERE id = ${secondId} FOR UPDATE
            `;

            /**
             * - 5. Derive sender balance from ledger
             */
            const result = await tx.$queryRaw`
                SELECT
                    COALESCE(SUM(CASE WHEN "type" = 'CREDITED' THEN amount ELSE 0 END), 0) -
                    COALESCE(SUM(CASE WHEN "type" = 'DEBITED'  THEN amount ELSE 0 END), 0) AS balance
                FROM ledger_entries
                WHERE "accountId" = ${fromAccount}
            `;

            const balance = Number(result[0].balance);

            if (balance < amount) {
                throw new Error(`INSUFFICIENT_BALANCE:${balance}`);
            }

            /**
             * - 6. Create transaction (PENDING)
             */
            transaction = await tx.transaction.create({
                data: {
                    fromAccountId: fromAccount,
                    toAccountId: toAccount,
                    amount,
                    idempotencyKey,
                    status: "PENDING",
                },
            });

            /**
             * - 7. Create DEBIT ledger entry
             */
            await tx.ledgerEntry.create({
                data: {
                    accountId: fromAccount,
                    transactionId: transaction.id,
                    amount,
                    type: "DEBITED",
                },
            });

            /**
             * - 8. Create CREDIT ledger entry
             */
            await tx.ledgerEntry.create({
                data: {
                    accountId: toAccount,
                    transactionId: transaction.id,
                    amount,
                    type: "CREDITED",
                },
            });

            /**
             * - 9. Mark transaction COMPLETED
             */
            transaction = await tx.transaction.update({
                where: { id: transaction.id },
                data: { status: "COMPLETED" },
            });
        });
    } catch (err) {
        // Mark transaction FAILED if it was created before the error
        if (transaction?.id) {
            await prisma.transaction.update({
                where: { id: transaction.id },
                data: { status: "FAILED" },
            });
        }

        if (err.message?.startsWith("INSUFFICIENT_BALANCE")) {
            const balance = err.message.split(":")[1];
            return res.status(400).json({
                message: `Insufficient balance. Current balance is ${balance}, requested amount is ${amount}`,
            });
        }

        return res.status(500).json({
            message: "Transaction failed, please try again",
        });
    }

    /**
     * 10. Send email notification
     */
    emailService.sendTransactionEmail(req.user.email, req.user.name, amount, toAccount)
        .catch(err => console.error("Non-critical: email notification failed", err));

    res.status(201).json({
        message: "Transaction completed successfully",
        transaction,
    });
}

/**
 * POST /api/transaction/system/initial-fund
 * Initial fund transaction — system account to user account
 */
async function createInitialFundTransaction(req, res) {
    const { toAccount, amount, idempotencyKey } = req.body;

    if (!toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({
            message: "toAccount, amount and idempotencyKey are required to initiate transaction",
        });
    }

    const toUserAccount = await prisma.account.findUnique({ where: { id: toAccount } });

    if (!toUserAccount) {
        return res.status(400).json({ message: "Invalid Account" });
    }

    const fromUserAccount = await prisma.account.findFirst({
        where: { userId: req.user.id },
    });

    if (!fromUserAccount) {
        return res.status(400).json({ message: "Invalid system account" });
    }

    let transaction;

    try {
        await prisma.$transaction(async (tx) => {
            transaction = await tx.transaction.create({
                data: {
                    fromAccountId: fromUserAccount.id,
                    toAccountId: toUserAccount.id,
                    amount,
                    idempotencyKey,
                    status: "PENDING",
                },
            });

            await tx.ledgerEntry.create({
                data: {
                    accountId: fromUserAccount.id,
                    transactionId: transaction.id,
                    amount,
                    type: "DEBITED",
                },
            });

            await tx.ledgerEntry.create({
                data: {
                    accountId: toUserAccount.id,
                    transactionId: transaction.id,
                    amount,
                    type: "CREDITED",
                },
            });

            transaction = await tx.transaction.update({
                where: { id: transaction.id },
                data: { status: "COMPLETED" },
            });
        });
    } catch (err) {
        if (transaction?.id) {
            await prisma.transaction.update({
                where: { id: transaction.id },
                data: { status: "FAILED" },
            });
        }

        return res.status(500).json({ message: "Initial fund transaction failed" });
    }

    res.status(201).json({
        message: "Initial fund transaction completed successfully",
        transaction,
    });
}

module.exports = {
    createTransaction,
    createInitialFundTransaction,
};