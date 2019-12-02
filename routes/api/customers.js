const mongoose = require("mongoose");
const router = require("express").Router();
const auth = require("../auth");
const customerController = require("../../controllers/customerController");
const userController = require("../../controllers/userController");
const { isValid } = require("../../utils");
const { signaturePath } = require("../../config");
var path = require("path");
const fs = require("fs");

const Customer = mongoose.model("Customer");
const Address = mongoose.model("Address");

//list all customers
router.get(
  "/filter/:filter/:pageNo/:perPage",
  auth.required,
  userController.getUser,
  userController.grantAccess("readAny"),
  (req, res, next) => {
    let perPage = parseInt(req.params.perPage) || 50;
    let pageNo = parseInt(req.params.pageNo) || 1;
    const filter = req.params.filter;

    if (perPage > 200) {
      perPage = 200;
    }

    console.log("perPage:", perPage);
    console.log("pageNo:", pageNo);
    Customer.countDocuments()
      .then(count => {
        const pages = Math.ceil(count / perPage) || 1;
        if (pageNo > pages) {
          pageNo = pages;
        }
        const offset = (pageNo - 1) * perPage;
        console.log("count:", count);
        console.log("pages:", pages);
        console.log("offset:", offset);
        Customer.find({
          $or: [{ peaId: filter }, { firstName: filter }, { lastName: filter }]
        })
          .skip(offset)
          .limit(perPage)
          .then(customers => {
            // console.log(customers);
            return res.json({
              customers: customers,
              // count: count,
              pageNo: pageNo,
              // perPage: perPage,
              pages: pages
            });
          })
          .catch(next);
      })
      .catch(next);
  }
);

//list all customers
router.get(
  "/all/?:pageNo?/?:perPage?",
  auth.required,
  userController.getUser,
  userController.grantAccess("readAny"),
  (req, res, next) => {
    let perPage = parseInt(req.params.perPage) || 50;
    let pageNo = parseInt(req.params.pageNo) || 1;

    if (perPage > 200) {
      perPage = 200;
    }

    console.log("perPage:", perPage);
    console.log("pageNo:", pageNo);
    Customer.countDocuments()
      .then(count => {
        const pages = Math.ceil(count / perPage) || 1;
        if (pageNo > pages) {
          pageNo = pages;
        }
        const offset = (pageNo - 1) * perPage;
        console.log("count:", count);
        console.log("pages:", pages);
        console.log("offset:", offset);
        Customer.find({})
          .skip(offset)
          .limit(perPage)
          .then(customers => {
            // console.log(customers);
            return res.json({
              customers: customers,
              // count: count,
              pageNo: pageNo,
              // perPage: perPage,
              pages: pages
            });
          })
          .catch(next);
      })
      .catch(next);
  }
);

//query a customer by peaId
router.get(
  "/peaid/:peaId",
  auth.required,
  userController.getUser,
  userController.grantAccess("readAny"),
  customerController.getCustomerByPeaId,
  (req, res, next) => {
    return res.json(req.customer);
  }
);

const verifyCustomer = (customer, verifyData) => {
  customer.verifies.push({
    ...verifyData,
    signature: saveSignatureToFile(verifyData.signatureBase64, customer.peaId)
  });
  return customer.save();
};

router.put(
  "/verify/:peaId",
  auth.required,
  userController.getUser,
  userController.grantAccess("updateAny"),
  customerController.checkVerifyBody,
  customerController.getCustomerByPeaId,
  (req, res, next) => {
    const customer = req.customer;

    if (!isValid(req.body.verify)) {
      return req.status(400);
    }

    return verifyCustomer(customer, req.body.verify).then(() => {
      return res.json({
        status: "verify updated"
      });
    });
  }
);

//update a customer by peaId
router.put(
  "/:peaId",
  auth.required,
  userController.getUser,
  userController.grantAccess("updateAny"),
  customerController.checkUpdateBody,
  customerController.getCustomerByPeaId,
  (req, res, next) => {
    const customerData = req.body.customer;
    const customer = req.customer;
    const updates = [];

    if (isValid(customerData.address)) {
      if (isValid(customerData.address.houseNo)) {
        customer.address.houseNo = customerData.address.houseNo;
        updates.push("address.houseNo");
      }
      if (isValid(customerData.address.mooNo)) {
        customer.address.mooNo = customerData.address.mooNo;
        updates.push("address.mooNo");
      }
      if (isValid(customerData.address.districtNo)) {
        customer.address.districtNo = customerData.address.districtNo;
        updates.push("address.districtNo");
      }
    }

    if (isValid(customerData.title)) {
      customer.title = customerData.title;
      updates.push("title");
    }
    if (isValid(customerData.firstName)) {
      customer.firstName = customerData.firstName;
      updates.push("firstName");
    }
    if (isValid(customerData.lastName)) {
      customer.lastName = customerData.lastName;
      updates.push("lastName");
    }

    if (isValid(customerData.soldierNo)) {
      customer.soldierNo = customerData.soldierNo;
      updates.push("soldierNo");
    }

    if (isValid(customerData.war)) {
      customer.war = customerData.war;
      updates.push("war");
    }

    return customer.save().then(() => {
      return res.json({
        status: "updated",
        updates: updates
      });
    });
  }
);

const saveSignatureToFile = (base64Data, fileName) => {
  if (!base64Data) return "";
  const signatureFileName = `${fileName}_${Date.now()}.png`;
  signatureFullPath = path.join(signaturePath, signatureFileName);
  base64Data = base64Data.replace(/^data:([A-Za-z-+/]+);base64,/, "");
  fs.writeFileSync(signatureFullPath, base64Data, {
    encoding: "base64"
  });
  return signatureFileName;
};

//create a new customer
router.post(
  "/",
  auth.required,
  userController.getUser,
  userController.grantAccess("createAny"),
  (req, res, next) => {
    // console.log(req.body)
    if (
      typeof req.body.customer === "undefined" ||
      typeof req.body.customer.address === "undefined" ||
      typeof req.body.verify === "undefined"
    ) {
      return res.sendStatus(400);
    }
    // console.log(req.body);

    const customer = new Customer();
    const address = new Address();

    address.houseNo = req.body.customer.address.houseNo;
    address.mooNo = req.body.customer.address.mooNo;
    address.districtNo = req.body.customer.address.districtNo;
    customer.address = address;

    customer.title = req.body.customer.title;
    customer.firstName = req.body.customer.firstName;
    customer.lastName = req.body.customer.lastName;
    customer.peaId = req.body.customer.peaId;
    customer.soldierNo = req.body.customer.soldierNo;
    customer.war = req.body.customer.war;
    customer.privilegeDate = new Date();

    return verifyCustomer(customer, req.body.verify)
      .then(() => {
        res.json({
          status: "success"
        });
      })
      .catch(next);
  }
);

router.delete(
  "/:peaId",
  auth.required,
  userController.getUser,
  userController.grantAccess("deleteAny"),
  (req, res, next) => {
    const peaId = req.params.peaId;
    if (typeof peaId === "undefined") {
      return res.status(400).json({
        error: "bad request"
      });
    }

    Customer.findOneAndRemove({ peaId: peaId }).then(customer => {
      if (!customer) {
        return res.status(410).json({
          status: "gone"
        });
      }
      return res.json({
        status: "deleted"
      });
    });
  }
);

module.exports = router;
