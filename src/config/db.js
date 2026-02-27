const mongoose = require('mongoose');
const dotenv = require('dotenv');

async function connectDB(){
    try{
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected  to DB successfully")
    }catch(err){
        console.log("Error in connectDB : ",err)
        process.exit(1);
    }
}

module.exports = connectDB;