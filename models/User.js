const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const secret = require("../config").secret;
const expireDay = require("../config").expireDay;

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      lowercase: true,
      unique: true,
      required: [true, "Username ไม่ควรว่าง"],
      match: [/^[a-zA-Z0-9]+$/, "Username ไม่ถูกต้อง"],
      index: true
    },
    displayName: {
      type: String,
      required: [true, "ชื่อที่แสดงไม่ควรว่าง"]
    },
    description: String,
    image: String,
    role: {
      type: "string",
      default: "supervisor",
      enum: ["supervisor", "administrator"]
    },
    hash: String,
    salt: String
  },
  { timestamps: true }
);

UserSchema.plugin(uniqueValidator, { message: "Username มีอยู่แล้ว" });

UserSchema.methods.validPassword = function(password) {
  const hash = crypto
    .pbkdf2Sync(password, this.salt, 10000, 512, "sha512")
    .toString("hex");
  return this.hash === hash;
};

UserSchema.methods.setPassword = function(password) {
  this.salt = crypto.randomBytes(16).toString("hex");
  this.hash = crypto
    .pbkdf2Sync(password, this.salt, 10000, 512, "sha512")
    .toString("hex");
};

UserSchema.methods.generateJWT = function() {
  const today = new Date();
  const exp = new Date(today);
  exp.setDate(today.getDate() + expireDay);

  return jwt.sign(
    {
      id: this._id,
      username: this.username,
      exp: parseInt(exp.getTime() / 1000)
    },
    secret
  );
};

UserSchema.methods.toAuthJSON = function() {
  return {
    username: this.username,
    token: this.generateJWT(),
    displayName: this.displayName,
    description: this.description,
    image: this.image,
    role: this.role
  };
};

UserSchema.methods.toProfileJSONFor = function(user) {
  return {
    username: this.username,
    description: this.description,
    image: this.image
  };
};

mongoose.model("User", UserSchema);
