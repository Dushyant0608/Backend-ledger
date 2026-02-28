const userModel = require('../models/user.model')
const jwt = require('jsonwebtoken');
const tokenBlackListModel = require("../models/blackList.model");


async function authMiddleware (req, res , next) {

    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

    if(!token) {
        return res.status(401).json({
            message : "Unauthorized access : Token is missing"
        })
    }

    const isBlackListed = await tokenBlackListModel.findOne({token});

    if(isBlackListed){
        return res.status(401).json({
            message : "Unauthorized access, token is invalid"
        })
    }

    try {
        const decode = jwt.verify(token , process.env.JWT_SECRET) 

        const user = await userModel.findById(decode.userID)

        req.user = user;

        return next()
        

    } catch (error) {
        return res.status(401).json({
            message : "Unauthorized access : Token is invalid"
        })
    }
}

async function authSystemUserMiddleware (req,res,next){
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

    if(!token) {
        return res.status(403).json({
            message : "Unauthorized access :  Token is missing"
        })
    }

    const isBlackListed = await tokenBlackListModel.findOne({token});

    if(isBlackListed){
        return res.status(401).json({
            message : "Unauthorized access, token is invalid"
        })
    }

    try {
        const decode = jwt.verify(token , process.env.JWT_SECRET);

        const user = await userModel.findById(decode.userID).select("+systemUser");

        if(!user.systemUser){
            return res.status(403).json({
                message : "Forbidden access : Not a System User"
            })
        }
    
        req.user = user;
    
        return next();
        
    } catch (error) {
        return res.status(403).json({
            message : "Unauthorized access  : Token is invalid"
        })
    }
}


module.exports = {
    authMiddleware,
    authSystemUserMiddleware
};