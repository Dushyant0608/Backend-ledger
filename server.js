require('dotenv').config()
const app = require('./app');
const prisma = require('./src/config/db');

const server = app.listen(3000, () => {
    console.log("Server is running...");
});

process.on('SIGINT', async () => {
    server.close(async () => {
        await prisma.$disconnect();
        process.exit(0);
    })
});

process.on("SIGTERM", async () => {
    server.close(async () => {
        await prisma.$disconnect();
        process.exit(0);
    })
});

