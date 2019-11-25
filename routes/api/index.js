var router = require("express").Router();

router.use("/users", require("./users"));
router.use("/admin", require("./admin"));
router.use("/customers", require("./customers"));
// router.use('/profiles', require('./profiles'));
// router.use('/articles', require('./articles'));
// router.use('/tags', require('./tags'));

router.use((err, req, res, next) => {
  // console.log("ERROR NAME:" ,err.name)
  if (err.name === "ValidationError") {
    const errors = Object.keys(err.errors).reduce((errors, key) => {
      errors[key] = err.errors[key].message;
      return errors;
    }, {})
    console.warn(errors)
    return res.status(422).json({
      errors: errors
    });
  }

  return next(err);
});

module.exports = router;
