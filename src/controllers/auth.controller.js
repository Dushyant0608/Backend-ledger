const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");
const emailService = require('../services/email.service');


/**
 * - user register controller
 * - POST /api/auth/register
*/
async function userRegisterController(req , res) {
    const {email , name , password} = req.body;

    const isExist = await userModel.findOne({email : email});

    if(isExist){
        return res.status(422).json({
            message : "User already exist with provided email.",
            status :  "failed"
        })
    }

    const createdUser = await userModel.create({
        name,email,password
    })

    const token = jwt.sign({userID : createdUser._id} , process.env.JWT_SECRET , {expiresIn: "3d"});
    res.cookie("token" , token);
    res.status(201).json({
        User : {
            _id : createdUser._id,
            name : createdUser.name,
            email : createdUser.email
        },
        token
    })

    await emailService.sendRegistrationEmail(createdUser.email , createdUser.name);
}

/**
 * - user login controller
 * - POST /api/auth/login
*/
async function userLoginController(req,res) {
    const {email , password} = req.body;

    const user = await userModel.findOne({email}).select("+password");

    if(!user){
        return res.status(401).json({
            message : "Email or Password is Invalid"
        })
    }

    const isValidPassword = await user.comparePassword(password);

    if(!isValidPassword){
        return res.status(401).json({
            message : "Email or Password is Invalid"
        })
    }

    const token = jwt.sign({userID : user._id} , process.env.JWT_SECRET , {expiresIn: "3d"});

    res.cookie("token" , token);
    res.status(200).json({
        User : {
            _id : user._id,
            name : user.name,
            email : user.email
        },
        token
    })


}

module.exports = {
    userRegisterController,
    userLoginController
}