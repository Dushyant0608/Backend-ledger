const mongoose = require('mongoose');
const dotenv = require('dotenv');

async function connectDB(){
    await mongoose.connect(process.env.MONGO_URI)
    .then( ()=>{
        console.log("Server connected to DB!!")
    })
    .catch(err=>{
        console.log("Error connecting to DB!!")
    })
}

module.exports = connectDB;