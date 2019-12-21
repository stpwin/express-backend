var router = require("express").Router();

router.use("/users", require("./users"));
router.use("/admin", require("./admin"));
router.use("/customers", require("./customers"));
// router.use('/profiles', require('./profiles'));
// router.use('/articles', require('./articles'));
// router.use('/tags', require('./tags'));

router.use((err, req, res, next) => {
  if (err.name === "ValidationError") {
    const error = Object.keys(err.errors).map(k => err.errors[k].message);
    return res.status(422).json({
      error
    });
  }

  console.error("Server error:", err)
  return next(err);
});

module.exports = router;
