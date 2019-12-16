const router = require("express").Router();
const mongoose = require("mongoose");
const auth = require("../auth");
var path = require("path");

const customerController = require("../../controllers/customerController");
const userController = require("../../controllers/userController");

const Customer = mongoose.model("Customer");

var multer = require("multer");
var storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "signatures");
  },
  filename: (req, file, cb) => {
    cb(null, `${file.fieldname}-${req.customer.peaId}-${Date.now()}.png`);
  }
});
var upload = multer({ storage: storage });

router.post(
  "/:peaId",
  auth.required,
  userController.getUser,
  userController.grantAccess("updateAny"),
  customerController.checkVerifyBody,
  customerController.getCustomerByPeaId,
  upload.single("signature"),
  (req, res, next) => {
    // const customer = req.customer;

    // console.log("header", req.headers);
    console.log("appearDate", req.body.appearDate);
    console.log("privilegeDate", req.body.privilegeDate);
    console.log("file", req.file);

    res.sendStatus(500);

    return;
    if (!isValid(req.body.verify)) {
      return req.sendStatus(400);
    }

    return verifyCustomer(customer, req.body.verify)
      .then(() => {
        return res.json({
          status: "verify updated"
        });
      })
      .catch(next);
  }
);

module.exports = router;
