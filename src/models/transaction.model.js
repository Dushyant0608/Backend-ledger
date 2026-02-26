const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
    fromAccount : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "account",
        required : [true , "Transaction must be associated with a from account"],
        index : true
    },
    toAccount : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "account",
        required : [true , "Transaction must be associated with a to account"],
        index : true
    },
    status : {
        type : String,
        enum : {
            values : ["PENDING" , "COMPLETED" , "FAILED" , "REVERSED"],
            message : "Status can be either Pending , Completed , Failed or Reversed"
        },
        default : "PENDING"
    },
    amount : {
        type : Number,
        required : [true , "Amount is required to make a transaction"],
        min : [0 , "Amount can not be negative"]
    },
    idempotencyKey : {
        type : String, 
        required : [true , "Idempotency Key is required to make a transaction"],
        index : true,
        unique : true
    }
} , {
    timestamps : true
})

const transactionModel = mongoose.model("transaction" , transactionSchema);

module.exports = transactionModel;