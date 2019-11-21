const express = require('express')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const ExtractJwt = require("passport-jwt").ExtractJwt;
const JwtStrategy = require("passport-jwt").Strategy;
const passport = require("passport");
const jwt = require("jwt-simple");

const SECRET = "MY_SECRET_KEY";

const app = express()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

const jwtOptions = {
    jwtFromRequest: ExtractJwt.fromHeader("auth"),
    secretOrKey: SECRET,
}
const jwtAuth = new JwtStrategy(jwtOptions, (payload, done) => {
    if (payload.sub === "stpwin") done(null, true);
    else done(null, false);
});

passport.use(jwtAuth);

const loginMiddleWare = (req, res, next) => {
    console.log(req.body);
    if (req.body.username === "stpwin"
        && req.body.password === "sittiporn") next();
    else res.send("Wrong username and password");
};

app.post("/login", loginMiddleWare, (req, res) => {
    const payload = {
        sub: req.body.username,
        iat: new Date().getTime()
    };
    res.send(jwt.encode(payload, SECRET));
});

const requireJWTAuth = passport.authenticate("jwt", { session: false });
app.get("/", requireJWTAuth, (req, res) => {
    res.send("successfully");
});

// mongoose.connect('mongodb://localhost:27017/node-api-101', { useNewUrlParser: true })

// const Cat = mongoose.model('Cat', { name: String })
// const kitty = new Cat({ name: 'JavaScript' })
// kitty.save().then(() => console.log('meow'))



// app.get('/books', (req, res) => {
//     res.json(books)
// })

app.listen(3000, () => {
    console.log('Start server at port 3000.')
})