const router = require("express").Router();
const auth = require("../auth");

var multer = require("multer");
var storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "/signatures");
  },
  filename: (req, file, cb) => {
    cb(null, `${file.fieldname}-${Date.now()}`);
  }
});
var upload = multer({ storage: storage });

router.post(
  "/:peaId",
  //   auth.required,
  //   upload.single("signature"),
  // userController.getUser,
  // userController.grantAccess("updateAny"),
  // customerController.checkVerifyBody,
  // customerController.getCustomerByPeaId,
  (req, res, next) => {
    // const customer = req.customer;
    console.log("file", req.file);
    console.log("body", req.headers);

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
