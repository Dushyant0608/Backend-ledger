require('dotenv').config()
const app = require('./app');
const connectDB = require('./config/db');




connectDB().then(()=>{
    app.listen(3000, ()=>{
        console.log("Server is running...");
    })
});

