const mongoose = require("mongoose");
const router = require("express").Router();
const auth = require("../auth");
const customerController = require("../../controllers/customerController");
const userController = require("../../controllers/userController");
const { isValid } = require("../../utils");

const Customer = mongoose.model("Customer");
const Address = mongoose.model("Address");

//list all customers
router.get(
  "/?:pageNo?",
  auth.required,
  userController.getUser,
  userController.grantAccess("readAny"),
  (req, res, next) => {
    let perPage = req.body.perPage || 50;
    if (perPage > 200) {
      perPage = 200;
    }
    let pageNo = parseInt(req.params.pageNo) || 1;

    Customer.count()
      .then(count => {
        const pages = parseInt(count / perPage) || 1;
        if (pageNo > pages) {
          pageNo = pages;
        }
        const skip = (pageNo - 1) * perPage;
        Customer.find({})
          .skip(skip)
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

      if (isValid(customerData.address.village)) {
        customer.address.village = customerData.address.village;
        updates.push("address.village");
      }

      if (isValid(customerData.address.roomNo)) {
        customer.address.roomNo = customerData.address.roomNo;
        updates.push("address.roomNo");
      }

      if (isValid(customerData.address.classNo)) {
        customer.address.classNo = customerData.address.classNo;
        updates.push("address.classNo");
      }

      if (isValid(customerData.address.mooNo)) {
        customer.address.mooNo = customerData.address.mooNo;
        updates.push("address.mooNo");
      }
      if (isValid(customerData.address.alleyway)) {
        customer.address.alleyway = customerData.address.alleyway;
        updates.push("address.alleyway");
      }
      if (isValid(customerData.address.soi)) {
        customer.address.soi = customerData.address.soi;
        updates.push("address.soi");
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
    if (isValid(customerData.peaId)) {
      customer.peaId = customerData.peaId;
      updates.push("peaId");
    }
    if (isValid(customerData.dateAppear)) {
      customer.dateAppear.push(customerData.dateAppear);
      updates.push("dateAppear");
    }
    if (isValid(customerData.authorize)) {
      customer.authorize = customerData.authorize;
      updates.push("authorize");
    }
    if (isValid(customerData.soldierNo)) {
      customer.soldierNo = customerData.soldierNo;
      updates.push("soldierNo");
    }

    if (isValid(customerData.war)) {
      customer.war = customerData.war;
      updates.push("war");
    }

    if (isValid(customerData.signature)) {
      customer.signature = customerData.signature;
      updates.push("signature");
    }

    return customer.save().then(() => {
      return res.json({
        status: "updated",
        updates: updates
      });
    });
  }
);

//create a new customer
router.post(
  "/",
  auth.required,
  userController.getUser,
  userController.grantAccess("createAny"),
  (req, res, next) => {
    const customer = new Customer();
    const address = new Address();

    address.houseNo = req.body.customer.address.houseNo;
    address.village = req.body.customer.address.village;
    address.roomNo = req.body.customer.address.roomNo;
    address.classNo = req.body.customer.address.classNo;
    address.mooNo = req.body.customer.address.mooNo;
    address.alleyway = req.body.customer.address.alleyway;
    address.soi = req.body.customer.address.soi;
    address.districtNo = req.body.customer.address.districtNo;

    customer.title = req.body.customer.title;
    customer.firstName = req.body.customer.firstName;
    customer.lastName = req.body.customer.lastName;
    customer.peaId = req.body.customer.peaId;
    customer.dateAppear.push(req.body.customer.dateAppear);
    customer.authorize = req.body.customer.authorize;
    customer.soldierNo = req.body.customer.soldierNo;
    customer.war = req.body.customer.war;
    customer.signature = req.body.customer.signature;
    customer.address = address;

    customer
      .save()
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
