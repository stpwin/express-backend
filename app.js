const http = require("http"),
  path = require("path"),
  methods = require("methods"),
  express = require("express"),
  bodyParser = require("body-parser"),
  session = require("express-session"),
  cors = require("cors"),
  passport = require("passport"),
  errorhandler = require("errorhandler"),
  mongoose = require("mongoose");
// multer = require("multer"),
// upload = multer();

const { isProduction, mongoDBUri, port, secret } = require("./config");

// Create global app object
const app = express();

app.use(cors());

// Normal express config defaults
app.use(require("morgan")("dev"));

app.use("/api/customers/verify", require("./routes/api/verifyCustomer"));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json()); ////Fix this

app.use(require("method-override")());
app.use(express.static(__dirname + "/public"));

app.use(
  session({
    secret: secret,
    cookie: { maxAge: 60000 },
    resave: false,
    saveUninitialized: false
  })
);

mongoose
  .connect(mongoDBUri, {
    useCreateIndex: true,
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => {
    console.log("Connected to the Database successfully");
  });

require("./models/User");
require("./models/Customer");

require("./config/passport");

app.use(require("./routes"));

if (!isProduction) {
  app.use(errorhandler());
  mongoose.set("debug", true);
  app.use(async (err, req, res, next) => {
    console.log(err.stack);

    res.status(err.status || 500);

    res.json({
      errors: {
        message: err.message,
        error: err
      }
    });
  });
}

/// catch 404 and forward to error handler
app.use(async (req, res, next) => {
  const err = new Error("Not Found");
  err.status = 404;
  next(err);
});

/// error handlers

// production error handler
// no stacktraces leaked to user
app.use(async (err, req, res, next) => {
  res.status(err.status || 500);
  res.json({
    errors: {
      message: err.message,
      error: {}
    }
  });
});

// finally, let's start our server...
const server = app.listen(port, () => {
  console.log("Listening on port " + server.address().port);
});
