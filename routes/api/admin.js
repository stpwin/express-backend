const mongoose = require("mongoose");
const router = require("express").Router();
const auth = require("../auth");
const userController = require("../../controllers/userController");

router.get(
  "/",
  auth.required,
  userController.getUser,
  userController.grantAccess("readAny"),
  (req, res, next) => {
    return res.json({
      status: "Hello"
    });
  }
);


module.exports = router;
