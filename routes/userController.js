const {roles} = require('./roles.js')
const mongoose = require('mongoose');
const User = mongoose.model('User');

exports.getUser = async (req, res, next) => {
    try {
        User.findById(req.payload.id).then(function (user) {
            if (!user) { return res.sendStatus(401); } //Unauhorized

            req.user = user.toAuthJSON();
            next();
        }).catch(next);
    } catch (error) {
        next(error);
    }
}

exports.grantAccess = function(action, resource) {
    return async(req,res,next) => {
        try{
            const permission = roles.can(req.user.role)[action](resource);
            if (!permission.granted){
                return res.status(401).json({
                    error: "You don't have enough permission to perform this action"
                });
            }
            next();
        } catch(error){
            next(error);
        }
    }
}

exports.allowIfLoggedin = async (req, res, next) => {
    try {
        const user = res.locals.loggedInUser;
        if (!user)
            return res.status(401).json({
                error: "You need to be logged in to access this route"
            });
        req.user = user;
        next();
    } catch (error) {
        next(error);
    }
}