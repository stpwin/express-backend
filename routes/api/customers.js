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
          console.log(docs[0].metadata);
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
  "/all?/", //?:pageNo?/?:perPage?
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

    // Customer.countDocuments()
    //   .then(count => {

    //     Customer.find(query)
    //       .skip(offset)
    //       .limit(limit)
    //       .then(customers => {
    //         // console.log(customers);
    //         return res.json({
    //           customers: customers,
    //           metadata: {
    //             page: page,
    //             pages: pages
    //           }
    //         });
    //       })
    //       .catch(next);
    //   })
    //   .catch(next);
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
  const signatureFileName = `${customer.peaId}_${Date.now()}.png`;
  customer.verifies.push({
    ...verifyData,
    signature: signatureFileName
  });
  return customer.save().then(() => {
    saveSignatureToFile(verifyData.signatureBase64, signatureFileName);
    return true;
  });
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
