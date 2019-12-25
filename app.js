const http = require("http"),
  path = require("path"),
  methods = require("methods"),
  express = require("express"),
  bodyParser = require("body-parser"),
  session = require("express-session"),
  cors = require("cors"),
  passport = require("passport"),
  errorhandler = require("errorhandler"),
  mongoose = require("mongoose"),
  https = require("https"),
  fs = require("fs");
// multer = require("multer"),
// upload = multer();

const key = fs.readFileSync("./cert.key");
const cert = fs.readFileSync("./cert.pem");

const {
  isProduction,
  isInitial,
  mongoDBUri,
  port,
  secret
} = require("./config");

// Create global app object
const app = express();
const server = https.createServer(
  {
    key: key,
    cert: cert
  },
  app
);

app.use(cors());

// Normal express config defaults
app.use(require("morgan")("dev"));

app.use(
  bodyParser.urlencoded({
    extended: true
  })
);
app.use(bodyParser.json()); ////Fix this

app.use(require("method-override")());
app.use(express.static(__dirname + "/public"));

app.use(
  session({
    secret: secret,
    cookie: {
      maxAge: 60000
    },
    resave: false,
    saveUninitialized: false
  })
);

mongoose
  .connect(mongoDBUri, {
    useCreateIndex: true,
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false
  })
  .then(() => {
    if (isInitial) {
      console.log("Checking users...");
      const User = mongoose.model("User");
      const user = new User();
      user.username = "superadmin";
      user.displayName = "SuperAdmin";
      user.description = "initial user";
      user.role = "administrator";

      user.setPassword("59122420124");

      user
        .save()
        .then(() => {
          console.log("Create user success");
        })
        .catch(err => {
          console.error(err);
        });
    }

    console.log("Connected to the Database successfully");
  });

require("./models/User");
require("./models/Customer");

require("./models/Counter");

require("./config/passport");

app.use(require("./routes"));

/// catch 404 and forward to error handler
app.use(async (req, res, next) => {
  const err = new Error("Not Found");
  err.status = 404;
  next(err);
});

const production = false;
if (production) {
  app.use(async (err, req, res, next) => {
    res.status(err.status || 500).json({
      errors: {
        message: err.message,
        error: {}
      }
    });
  });

  const appServer = server.listen(port, () => {
    console.log("Listening on port " + server.address().port);
  });
} else {
  mongoose.set("debug", true);

  app.use(errorhandler());
  app.use(async (err, req, res, next) => {
    res.status(err.status || 500).json({
      errors: {
        message: err.message,
        error: err
      }
    });
  });

  const _server = app.listen(port, () => {
    console.log("Listening on port " + _server.address().port);
  });
}
