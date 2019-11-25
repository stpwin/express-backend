module.exports = {
  secret: process.env.NODE_ENV === "production" ? process.env.SECRET : "secret",
  expireDay:
    process.env.NODE_ENV === "production" ? process.env.EXPIRE_DAY : 60,
  isProduction: process.env.NODE_ENV === "production",
  mongoDBUri:
    process.env.NODE_ENV === "production"
      ? process.env.MONGODB_URI
      : "mongodb://localhost:27017/real-world",
  port: process.env.NODE_ENV === "production" ? process.env.PORT : 3000,
  signaturePath:
    process.env.NODE_ENV === "production"
      ? process.env.SIGNATURE_PATH
      : "signatures"
};
