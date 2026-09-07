require('dotenv').config()
const app = require('./app');
const prisma = require('./src/config/db');

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}...`);
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

