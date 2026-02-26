const mongoose = require('mongoose');
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
    email : {
        type : String,
        required : [true , "Email is required for creating a user"],
        trim : true,
        lowercase : true,
        match : [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address'],
        unique : [true , "Email already exists"]
    } , 
    name : {
        type : String , 
        required : [true , "Name is required for creating a user"]

    },
    password : {
        type : String,
        required : [true , "Must enter password to create user"],
        minlength : [6 , "Password must contain 6 characters"],
        select : false

    }
} , {
    timestamps : true
});


userSchema.pre("save" , async function(next){
    if(!this.isModified("password")){
        return 
    }

    const hash = await bcrypt.hash(this.password , 10)
    this.password = hash;

})

userSchema.methods.comparePassword = async function(password){
    return await bcrypt.compare(password , this.password);
}

const userModel = mongoose.model("User" , userSchema);

module.exports = userModel;