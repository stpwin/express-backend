const mongoose = require('mongoose');
const router = require('express').Router();
const passport = require('passport');
const auth = require('../auth');
const userController = require('../userController');

const User = mongoose.model('User');
const Role = mongoose.model('Role');

router.get('/user', auth.required, userController.getUser, function (req, res, next) { //get user
    console.log(req.payload)
    console.log(req.user)
    return res.json(req.user);
});

router.get('/admin', auth.required, userController.getUser, userController.grantAccess('readAny', 'profile'), function (req, res, next) { //get user
    console.log(req.payload)
    console.log(req.user)
    return res.json(req.user);
});

router.put('/user', auth.required, function (req, res, next) { //update user
    User.findById(req.payload.id).then(function (user) {
        if (!user) { return res.sendStatus(401); }

        // only update fields that were actually passed...
        if (typeof req.body.user.username !== 'undefined') {
            user.username = req.body.user.username;
        }
        if (typeof req.body.user.email !== 'undefined') {
            user.email = req.body.user.email;
        }
        if (typeof req.body.user.bio !== 'undefined') {
            user.bio = req.body.user.bio;
        }
        if (typeof req.body.user.image !== 'undefined') {
            user.image = req.body.user.image;
        }
        if (typeof req.body.user.oldPassword !== 'undefined' && typeof req.body.user.newPassword !== 'undefined') {
            if (!req.body.user.oldPassword || !req.body.user.newPassword){
                return res.status(422).json({ errors: { password: "can't be blank" } });
            }
            if (!user.validPassword(req.body.user.oldPassword)){
                return res.status(422).json({ errors: { password: "mismatch" } });
            }
            user.setPassword(req.body.user.newPassword);
        }

        return user.save().then(function () {
            return res.json({ user: user.toAuthJSON() });
        });
    }).catch(next);
});

router.post('/users/login', function (req, res, next) { //login
    if (!req.body.user.email) {
        return res.status(422).json({ errors: { email: "can't be blank" } });
    }

    if (!req.body.user.password) {
        return res.status(422).json({ errors: { password: "can't be blank" } });
    }

    passport.authenticate('local', { session: false }, function (err, user, info) {
        if (err) { return next(err); }

        if (user) {
            user.token = user.generateJWT();
            return res.json({ user: user.toAuthJSON() });
        } else {
            return res.status(422).json(info);
        }
    })(req, res, next);
});

router.post('/users', function (req, res, next) { //create user
    const user = new User();

    user.username = req.body.user.username;
    user.email = req.body.user.email;
    user.setPassword(req.body.user.password);
    user.role = "administrator";

    // var role = new Role("")
    // user.setRole(role);

    user.save().then(function () {
        return res.json({ user: user.toAuthJSON() });
    }).catch(next);
});

module.exports = router;