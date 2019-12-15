const mongoose = require("mongoose");
const router = require("express").Router();
const auth = require("../auth");
const customerController = require("../../controllers/customerController");
const userController = require("../../controllers/userController");
const { isValid } = require("../../utils");
const { signaturePath } = require("../../config");
const path = require("path");
const fs = require("fs");

const multer = require("multer");

const Customer = mongoose.model("Customer");
const Address = mongoose.model("Address");

//list fill customers
router.get(
  //"/filter/:filterText/:war?/?:pageNo?/?:perPage?",
  "/filter/:filterText?/", //?war=*&page=1&limit=10
  auth.required,
  userController.getUser,
  userController.grantAccess("readAny"),
  (req, res, next) => {
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
      // console.log(wars);
      warFilters = { war: { $in: wars } };
    }

    if (filterText.match(/[A-zก-์]/g)) {
      queries.push({ firstName: { $regex: filterText, $options: "i" } });
      queries.push({ lastName: { $regex: filterText, $options: "i" } });
    } else if (filterText.match(/[0-9]/g)) {
      queries.push({ peaId: { $regex: filterText, $options: "i" } });
    } else {
      return res.sendStatus(204);
    }
    // console.log(queries);
    console.log("Filter:", filterText);
    console.log("War:", war);
    console.log("Page:", page);
    console.log("Limit:", limit);

    const offset = (page - 1) * limit;
    Customer.aggregate(
      [
        {
          $match: {
            $or: queries,
            ...warFilters
          }
        },
        // { $sort: {} },
        {
          $facet: {
            metadata: [{ $count: "total" }, { $addFields: { page: page } }],
            data: [{ $skip: offset }, { $limit: limit }]
          }
        }
      ],
      (err, docs) => {
        // console.log("Result:", docs);
        if (!docs[0] || !docs[0].metadata[0]) {
          // console.log(docs[0].metadata);
          return res.sendStatus(204);
        }

        const pages = Math.ceil(docs[0].metadata[0].total / limit) || 1;

        if (page > pages) {
          page = pages;
        }
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
    let limit = parseInt(req.query.limit) || 50;
    let page = parseInt(req.query.page) || 1;
    const war = req.query.war;
    const offset = (page - 1) * limit;

    if (limit > 200) {
      limit = 200;
    }

    let query = {};
    if (war && war !== "*") {
      query = { war: { $in: war.split(",") } };
    }

    console.log("Page:", page);
    console.log("Limit:", limit);
    console.log("Offset:", offset);

    Customer.aggregate(
      [
        {
          $match: query
        },
        {
          $facet: {
            metadata: [{ $count: "total" }, { $addFields: { page: page } }],
            data: [{ $skip: offset }, { $limit: limit }]
          }
        }
      ],
      (err, docs) => {
        // console.log("Result:", docs);
        if (!docs[0] || !docs[0].metadata[0]) {
          console.log(docs[0].metadata);
          return res.sendStatus(204);
        }
        const count = docs[0].metadata[0].total;
        const pages = Math.ceil(count / limit) || 1;
        page = page > pages ? pages : page;

        console.log("Count:", count);
        console.log("Pages:", pages);
        console.log(docs[0].data);

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

//query a customer by peaId
router.get(
  "/peaid/:peaId",
  auth.required,
  userController.getUser,
  userController.grantAccess("readAny"),
  customerController.getCustomerByPeaId,
  (req, res, next) => {
    // console.log(req.customer.verifies[8].privilegeDate);
    return res.json(req.customer);
  }
);

router.get(
  "/signature/:peaId/:verifyId",
  auth.required,
  userController.getUser,
  userController.grantAccess("readAny"),
  customerController.getCustomerSignature,
  (req, res, next) => {
    console.log("signature:", req.signature);

    var get_file_options = {
      root: "signatures",
      dotfiles: "deny",
      headers: {
        "x-timestamp": Date.now(),
        "x-sent": true
      }
    };

    res.sendfile(`${req.signature}`, get_file_options, err => {
      if (err) {
        // console.error("sendfile error:", err);
        res.sendStatus(204);
      }

      console.log("sendfile success");
    });
    // res.json(req.signature);
  }
);

// const verifyCustomer = (customer, verify) => {
//   customer.verifies.push(verify);
//   return customer.save().then(() => {
//     // saveSignatureToFile(verifyData.signatureBase64, signatureFileName);
//     return true;
//   });
// };

// const verifyHasRequiredFields = fields => {
//   const dateAppear = fields.dateAppear
//     ? new Date(JSON.parse(fields.dateAppear))
//     : null;
//   const privilegeDate = fields.privilegeDate
//     ? new Date(JSON.parse(fields.privilegeDate))
//     : null;
//   return dateAppear && privilegeDate;
// };

var storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "signatures");
  },
  filename: (req, file, cb) => {
    cb(null, `${file.fieldname}-${req.customer.peaId}-${Date.now()}.png`);
  }
});
var upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const dateAppear = req.body.dateAppear
      ? new Date(JSON.parse(req.body.dateAppear))
      : null;
    const privilegeDate = req.body.privilegeDate
      ? new Date(JSON.parse(req.body.privilegeDate))
      : null;
    if (dateAppear && privilegeDate) {
      req.verify = { dateAppear, privilegeDate };
      cb(null, true);
      return;
    }
    cb(new Error("Expected object for argument options"), false);
  }
});

router.put(
  "/verify/:peaId",
  auth.required,
  userController.getUser,
  userController.grantAccess("updateAny"),
  customerController.getCustomerByPeaId,
  upload.single("signature"),
  (req, res, next) => {
    // console.log("verify:", req.verify);
    // console.log("file", req.file);
    const signature = req.file.filename
    req.customer.verifies.push({ ...req.verify, signature });
    req.customer
      .save()
      .then(() => {
        return res.json({
          status: "verify updated"
        });
      })
      .catch(next);
  }
);

// router.post(
//   "/signature/upload/:peaId",
//   auth.required,
//   userController.getUser,
//   userController.grantAccess("updateAny"),
//   customerController.getCustomerByPeaId,
//   (res, req, next) => {
//     upload(req, res, err => {
//       if (err instanceof multer.MulterError) {
//         console.error("MulterError", err);
//       } else if (err) {
//         console.error(err);
//       }

//       if (err) {
//         req.status(500).json({ errors: err });
//       }

//       console.log("upload success");

//       req.json({
//         status: "success"
//       });
//     });
//   }
// );

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

    if (isValid(customerData.authorize)) {
      customer.authorize = customerData.authorize;
      updates.push("authorize");
    }

    return customer
      .save()
      .then(() => {
        return res.json({
          status: "updated",
          updates: updates
        });
      })
      .catch(next);
  }
);

const saveSignatureToFile = (base64Data, fileName) => {
  if (!base64Data) return "";
  // const signatureFileName = `${fileName}_${Date.now()}.png`;
  signatureFullPath = path.join(signaturePath, fileName);
  base64Data = base64Data.replace(/^data:([A-Za-z-+/]+);base64,/, "");
  fs.writeFileSync(signatureFullPath, base64Data, {
    encoding: "base64"
  });
  return true;
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
      return res.sendStatus(400);
    }

    Customer.findOneAndRemove({ peaId: peaId }).then(customer => {
      if (!customer) {
        return res.sendStatus(410);
      }
      return res.json({
        status: "deleted"
      });
    });
  }
);

module.exports = router;
