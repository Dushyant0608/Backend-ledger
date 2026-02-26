const mongoose = require("mongoose");

const ledgerSchema = mongoose.Schema({
    account : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "account",
        required : [true , "Ledger must be associated with a Schema"],
        index : true,
        immutable : true
    },
    amount : {
        type : Number,
        required : [true , "Amount is required for creating a ldeger entry"],
        immutable : true
    },
    transaction : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "transaction",
        index : true,
        immutable : true
    },
    type : {
        type : String,
        enum : {
            values : ["DEBITED" , "CREDITED"],
            message : "Type can be either Creadited or Debited"
        },
        required : true,
        immutable : true
    }
})

function preventLedgerModification() {
    throw new error ("Ledger entries are immutable and can never be modified or deleted");
}

ledgerSchema.pre('findOneAndUpdate' , preventLedgerModification);
ledgerSchema.pre('updateOne' , preventLedgerModification);
ledgerSchema.pre('deleteOne' , preventLedgerModification);
ledgerSchema.pre('remove' , preventLedgerModification);
ledgerSchema.pre('deleteMany' , preventLedgerModification);
ledgerSchema.pre('updateMany' , preventLedgerModification);
ledgerSchema.pre('findOneAndDelete' , preventLedgerModification);
ledgerSchema.pre('findOneAndReplace' , preventLedgerModification);

const ledgerModel = mongoose.model("ledger" , ledgerSchema);

module.exports = ledgerModel;