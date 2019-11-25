
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var mongoose = require('mongoose');
var User = mongoose.model('User');

passport.use(new LocalStrategy({
    usernameField: 'user[username]',
    passwordField: 'user[password]'
}, (username, password, done) => {
    User.findOne({ username: username }).then(user => {
        if (!user || !user.validPassword(password)) {
            return done(null, false, { error: 'username or password is invalid!' });
        }

        return done(null, user);
    }).catch(done);
}));
