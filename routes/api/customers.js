const mongoose = require("mongoose");
const router = require("express").Router();
const auth = require("../auth");

const customerController = require("../../controllers/customerController");
const userController = require("../../controllers/userController");
const {
  isValid
} = require("../../utils");
const {
  signaturePath
} = require("../../config");
const multer = require("multer");

const Customer = mongoose.model("Customer");
const Address = mongoose.model("Address");

var storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, signaturePath);
  },
  filename: (req, file, cb) => {
    cb(null, `${file.fieldname}-${req.customer.peaId}-${Date.now()}.png`);
  }
});

var upload = multer({
  storage: storage,
}).single("signature");


//create a new customer
router.post(
  "/",
  auth.required,
  userController.getUser,
  userController.grantAccess("createAny"),
  (req, res, next) => {
    console.log("CREATE_A_CUSTOMER");

    const {
      customer: customerData
    } = req.body;
    const {
      address: addressData
    } = customerData;
    if (!customerData || !addressData) {
      return res.sendStatus(400);
    }

    const customer = new Customer();
    const address = new Address();

    address.houseNo = addressData.houseNo;
    address.mooNo = addressData.mooNo;
    address.districtNo = addressData.districtNo;
    customer.address = address;

    customer.peaId = customerData.peaId;
    customer.title = customerData.title;
    customer.firstName = customerData.firstName;
    customer.lastName = customerData.lastName;
    customer.authorize = customerData.authorize;
    customer.soldierNo = customerData.soldierNo;
    customer.war = customerData.war;

    customer
      .save()
      .then(() => {
        console.log("CREATE_A_CUSTOMER: SUCCESS");
        return res.json({
          status: "create_success"
        });
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
    console.log("GET_A_CUSTOMER");
    return res.json(req.customer);
  }
);

//list fill customers
router.get(
  "/filter/:filterText?/", //?war=*&page=1&limit=10
  auth.required,
  userController.getUser,
  userController.grantAccess("readAny"),
  (req, res, next) => {
    console.log("GET_FILTER_CUSTOMERS");
    const filterText = req.params.filterText;
    const war = req.query.war;
    let limit = parseInt(req.query.limit) || 50;
    let page = parseInt(req.query.page) || 1;

    if (limit > 200) {
      limit = 200;
    }

    const queries = [];
    let warFilters = {};
    if (war && war !== "*") {
      const wars = war.split(",");
      warFilters = {
        war: {
          $in: wars
        }
      };
    }

    if (filterText.match(/[A-zก-์]/g)) {
      queries.push({
        firstName: {
          $regex: filterText,
          $options: "i"
        }
      });
      queries.push({
        lastName: {
          $regex: filterText,
          $options: "i"
        }
      });
    } else if (filterText.match(/[0-9]/g)) {
      queries.push({
        peaId: {
          $regex: filterText,
          $options: "i"
        }
      });
    } else {
      return res.sendStatus(204);
    }

    const offset = (page - 1) * limit;
    Customer.aggregate(
      [{
        $match: {
          $or: queries,
          ...warFilters
        }
      },
      {
        $facet: {
          metadata: [{
            $count: "total"
          }, {
            $addFields: {
              page: page
            }
          }],
          data: [{
            $skip: offset
          }, {
            $limit: limit
          }]
        }
      }
      ],
      (err, docs) => {
        if (!docs || !docs[0] || !docs[0].metadata[0]) {
          return res.sendStatus(204);
        }

        const pages = Math.ceil(docs[0].metadata[0].total / limit) || 1;

        if (page > pages) {
          page = pages;
        }

        console.log("GET_FILTER_CUSTOMERS: SUCCESS");
        return res.status(200).json({
          metadata: {
            page: page,
            pages: pages
          },
          customers: docs[0].data
        });
      }
    ).catch(next);
  }
);

//list all customers
router.get(
  "/all", //?:pageNo?/?:perPage?
  auth.required,
  userController.getUser,
  userController.grantAccess("readAny"),
  (req, res, next) => {
    console.log("GET_ALL_CUSTOMER");
    let limit = parseInt(req.query.limit) || 50;
    let page = parseInt(req.query.page) || 1;
    const war = req.query.war;
    const offset = (page - 1) * limit;

    if (limit > 200) {
      limit = 200;
    }

    let query = {};
    if (war && war !== "*") {
      query = {
        war: {
          $in: war.split(",")
        }
      };
    }

    Customer.aggregate(
      [{
        $match: query
      },
      // { $project: { verifies: { $slice: ["$verifies", -6] } } },
      {
        $facet: {
          metadata: [{
            $count: "total"
          }, {
            $addFields: {
              page: page
            }
          }],
          data: [{
            $skip: offset
          }, {
            $limit: limit
          }]
        }
      }
      ],
      (err, docs) => {
        if (!docs || !docs[0] || !docs[0].metadata[0]) {
          return res.sendStatus(204);
        }
        const count = docs[0].metadata[0].total;
        const pages = Math.ceil(count / limit) || 1;
        page = page > pages ? pages : page;

        console.log("GET_ALL_CUSTOMER: SUCCESS");
        return res.json({
          customers: docs[0].data,
          metadata: {
            page: page,
            pages: pages
          }
        });
      }
    ).catch(next);
  }
);

router.get(
  "/signature/:peaId/:verifyId",
  auth.required,
  userController.getUser,
  userController.grantAccess("readAny"),
  customerController.getCustomerSignature,
  (req, res, next) => {
    console.log("GET_A_SIGNATURE");
    const get_file_options = {
      root: signaturePath,
      dotfiles: "deny",
      headers: {
        "x-timestamp": Date.now(),
        "x-sent": true
      }
    };

    res.sendFile(`${req.signature}`, get_file_options, err => {
      if (err) {
        // console.error("GET_A_SIGNATURE: Error:", err);
        res.sendStatus(204);
      }
      console.log("GET_A_SIGNATURE: SUCCESS");
    });
    // res.json(req.signature);
  }
);

router.put(
  "/verify/:peaId",
  auth.required,
  userController.getUser,
  userController.grantAccess("updateAny"),
  customerController.getCustomerByPeaId,
  // upload.any(),
  // upload,
  (req, res, next) => {
    console.log("VERIFY_CUSTOMER");

    let appearDate = req.header('appearDate')
    console.log(appearDate)
    if (!appearDate) {
      return res.sendStatus(422)
    }

    try {
      appearDate = JSON.parse(appearDate)
    } catch {
      return res.sendStatus(400)
    }

    // console.log("appearDate:", new Date(appearDate))
    // return res.sendStatus(500)

    upload(req, res, function (err) {
      console.log("Uploading...")
      if (err) {
        console.error("Upload failed:", err)
        return res.sendStatus(500)
      }

      req.customer.verifies.push({
        appearDate: appearDate,
        signature: req.file && req.file.filename
      });

      req.customer
        .save()
        .then(() => {
          console.log("VERIFY_CUSTOMER: SUCCESS");
          return res.json({
            status: "verify_success"
          });
        })
        .catch(err => {
          console.log(err)
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
    console.log("UPDATE_CUSTOMER");
    const { customer: customerData } = req.body;
    const { customer } = req;
    const updates = [];

    if (isValid(customerData.address)) {
      // if (isValid(customerData.address.houseNo)) {
      customer.address.houseNo = customerData.address.houseNo;
      updates.push("address.houseNo");
      // }
      // if (isValid(customerData.address.mooNo)) {
      customer.address.mooNo = customerData.address.mooNo;
      updates.push("address.mooNo");
      // }
      // if (isValid(customerData.address.districtNo)) {
      customer.address.districtNo = customerData.address.districtNo;
      updates.push("address.districtNo");
      // }
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

    if (isValid(customerData.authorize)) {
      customer.authorize = customerData.authorize;
      updates.push("authorize");
    }

    return customer
      .save()
      .then(() => {
        console.log("UPDATE_CUSTOMER: SUCCESS");
        return res.json({
          status: "update_success",
          updates: updates
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
    console.log("DELETE_CUSTOMER");
    const peaId = req.params.peaId;
    if (typeof peaId === "undefined") {
      return res.sendStatus(400);
    }

    Customer.findOneAndRemove({
      peaId: peaId
    })
      .then(customer => {
        console.log("DELETE_CUSTOMER: SUCCESS");
        if (!customer) {
          return res.sendStatus(410);
        }
        return res.json({
          status: "deleted"
        });
      })
      .catch(next);
  }
);

module.exports = router;