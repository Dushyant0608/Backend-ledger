const prisma = require('../config/db');

async function createAccountController (req,res) {
    const user = req.user;

    const account = await prisma.account.create({ data : { userId: req.user.id }});

    res.status(201).json({
        account
    })
}

async function getAllUserAccounts(req,res) {

    
    const accounts = await prisma.account.findMany({ where: { userId: req.user.id } });

    res.status(200).json({
        accounts
    })
}

async function getAccountBalance(req,res){
    const { accountId } = req.params;

    const account = await prisma.account.findFirst({ where: { id: accountId, userId: req.user.id} });

    if(!account){
        return res.status(404).json({
            message : "Account not found"
        })
    }

    const result = await prisma.$queryRaw`
        SELECT
            COALESCE(SUM(CASE WHEN type='CREDITED' THEN amount ELSE 0 END), 0) -
            COALESCE(SUM(CASE WHEN TYPE='DEBITED' THEN amount ELSE 0 END) , 0) AS balance
        FROM ledger_entries
        WHERE "accountId" = ${accountId}
    `;

    const balance = result[0].balance ?? 0;

    res.status(200).json({
        accountId : account.id,
        balance : balance
    })
}

module.exports = {
    createAccountController,
    getAllUserAccounts,
    getAccountBalance
}