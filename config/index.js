const dotenv = require("dotenv");
dotenv.config();

module.exports = {
  isInitial: process.env.INITIAL === "yes",
  secret: process.env.SECRET || "secret",
  expireDay: process.env.EXPIRE_DAY || 60,
  isProduction: process.env.NODE_ENV === "production",
  mongoDBUri:
    process.env.NODE_ENV === "production"
      ? process.env.MONGODB_URI_PRODUCTION
      : process.env.MONGODB_URI_DEVELOPMENT,
  port: process.env.PORT || 3000,
  signaturePath: process.env.SIGNATURE_PATH || "signatures"
};
