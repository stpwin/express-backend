const mongoose = require("mongoose");
const router = require("express").Router();
const auth = require("../auth");
var fs = require('fs');
var path = require('path');

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
const Counter = mongoose.model("Counter")

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

const getNextSequence = name => {
  return Counter.findByIdAndUpdate(name, {
    $inc: {
      "sequence": 1
    }
  }, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true
  }).then(result => {
    console.log("getNextSequence:", result)
    return result.sequence
  }).catch(err => {
    console.error("getNextSequence:", err)
  })
}

const getUndoSequence = name => {
  return Counter.findByIdAndUpdate(name, {
    $inc: {
      "sequence": -1
    }
  }, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true
  }).then(result => {
    console.log("getNextSequence:", result)
    return result.sequence
  }).catch(err => {
    console.error("getNextSequence:", err)
  })
}

// console.log("G1", getNextSequence("customer_g1"));
// console.log("G2", getNextSequence("customer_g2"));

const warsType = {
  "ภายในประเทศ": "g1",
  "เวียดนาม": "g1",
  "เกาหลี": "g1",
  "เหรียญชัยสมรภูมิ": "g2",
  "เอเชียบูรพา": "g2",
  "อินโดจีน": "g2",
  "ฝรั่งเศส": "g2"
};

const typeWars = {
  "1": ["ภายในประเทศ", "เวียดนาม", "เกาหลี"],
  "2": ["เหรียญชัยสมรภูมิ", "เอเชียบูรพา", "อินโดจีน", "ฝรั่งเศส"]
};

//create a new customer
router.post(
  "/",
  auth.required,
  userController.getUser,
  userController.grantAccess("createAny"),
  (req, res, next) => {
    console.log("CREATE_A_CUSTOMER");

    const {
      customer: {
        peaId,
        title,
        firstName,
        lastName,
        authorize,
        soldierNo,
        war,
        address: {
          houseNo,
          mooNo,
          districtNo
        }
      }
    } = req.body;
    console.log(req.body.customer)
    if (!peaId || (peaId && peaId.length < 12) || !firstName || !lastName || !authorize || !soldierNo || !war || !districtNo) {
      return res.sendStatus(400);
    }

    getNextSequence(`customer_${warsType[war]}`).then(sequence => {
      const customer = new Customer();
      const address = new Address();

      address.houseNo = houseNo;
      address.mooNo = mooNo;
      address.districtNo = districtNo;
      customer.address = address;

      customer.peaId = peaId;
      customer.title = title;
      customer.firstName = firstName;
      customer.lastName = lastName;
      customer.authorize = authorize;
      customer.soldierNo = soldierNo;
      customer.war = war;
      customer.seq = sequence;
      return customer
        .save()
        .then(() => {
          console.log("CREATE_A_CUSTOMER: SUCCESS");
          return res.json({
            status: "create_success"
          });
        }).catch(err => {
          next(err)
          return getUndoSequence(`customer_${warsType[war]}`).then(() => {
            console.log("Undo sequence success.")
          })
        })
    }).catch(next);
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
      const seq = parseInt(filterText)
      if (seq) {
        queries.push({
          seq
        });
      }

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

//fill customer by seq
router.get(
  "/seq/:war/:seq", //?war=*
  auth.required,
  userController.getUser,
  userController.grantAccess("readAny"),
  (req, res, next) => {
    console.log("GET_FILTER_CUSTOMERS_BY_SEQUENCE");

    let {
      war,
      seq
    } = req.params;
    seq = parseInt(seq)

    if (!war || !seq) {
      return res.sendStatus(400)
    }

    Customer.find({
      war: {
        $in: typeWars[war]
      },
      seq
    }).then(result => {
      if (result && result.length > 0) {
        console.log(result)
        return res.json({
          customers: result
        })
      }
      return res.json({
        customers: null
      })
    }).catch(next)
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

    console.log({
      appearDate
    })
    // return res.sendStatus(500)

    upload(req, res, function (err) {
      console.log("Uploading...")
      if (err) {
        console.error("Upload failed:", err)
        return res.sendStatus(500)
      }

      req.customer.verifies.push({
        appearDate,
        signature: req.file && req.file.filename
      });

      // console.log("verifies", req.customer.verifies)

      req.customer
        .save()
        .then(() => {
          console.log("VERIFY_CUSTOMER: SUCCESS");
          return res.json({
            status: "verify_success"
          });
        })
        .catch(next);
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
    const {
      customer: customerData
    } = req.body;
    const {
      customer
    } = req;
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

    if (isValid(customerData.peaId)) {
      customer.peaId = customerData.peaId;
      updates.push("peaId");
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

router.patch("/approve/:peaId/:verifyId",
  auth.required,
  userController.getUser,
  userController.grantAccess("deleteAny"),
  (req, res, next) => {

    const {
      peaId,
      verifyId
    } = req.params;
    let {
      approvedDate
    } = req.body
    if (!peaId || !verifyId) {
      return res.status(400).json({
        error: "Bad request"
      });
    }

    approvedDate = (approvedDate && new Date(approvedDate)) || new Date();

    Customer.update({
      peaId,
      'verifies._id': mongoose.Types.ObjectId(verifyId)
    }, {
      "$set": {
        "verifies.$.approvedDate": approvedDate
      }
    })
      .then(result => {
        console.log("approve result", result)
        if (!result) {
          return res.json({
            status: "approve_none"
          })
        }
        return res.json({
          status: "approved",
          approve: {
            peaId,
            verifyId,
            approvedDate
          }
        })
      }).catch(next)

  })

router.patch("/revoke_approve/:peaId/:verifyId",
  auth.required,
  userController.getUser,
  userController.grantAccess("deleteAny"),
  (req, res, next) => {

    const {
      peaId,
      verifyId
    } = req.params;
    if (!peaId || !verifyId) {
      return res.status(400).json({
        error: "Bad request"
      });
    }

    Customer.update({
      peaId,
      'verifies._id': mongoose.Types.ObjectId(verifyId)
    }, {
      "$set": {
        "verifies.$.approvedDate": null
      }
    })
      .then(result => {
        console.log("approve result", result)
        if (!result) {
          return res.json({
            status: "approve_none_revoked"
          })
        }
        return res.json({
          status: "approve_revoked",
          approve: {
            peaId,
            verifyId
          }
        })
      }).catch(next)
  })

router.patch("/verify/:peaId/:verifyId",
  auth.required,
  userController.getUser,
  userController.grantAccess("deleteAny"),
  (req, res, next) => {

    const {
      peaId,
      verifyId
    } = req.params;
    const {
      state
    } = req.body
    if (!peaId || !verifyId || !state) {
      return res.status(400).json({
        error: "Bad request"
      });
    }

    Customer.update({
      peaId,
      'verifies._id': mongoose.Types.ObjectId(verifyId)
    }, {
      "$set": {
        "verifies.$.state": state
      }
    })
      .then(result => {
        console.log("set_verify result", result)
        if (!result) {
          return res.json({
            status: "set_verify_none"
          })
        }
        return res.json({
          status: "set_verify_success",
          verify: {
            peaId,
            verifyId,
            state
          }
        })
      }).catch(next)
  })

router.delete("/verify/:peaId/:verifyId",
  auth.required,
  userController.getUser,
  userController.grantAccess("deleteAny"),
  (req, res, next) => {

    const {
      peaId,
      verifyId
    } = req.params;

    if (!peaId || !verifyId) {
      return res.status(400).json({
        error: "Bad request"
      });
    }

    Customer.findOneAndUpdate({
      peaId
    }, {
      $pull: {
        verifies: {
          _id: mongoose.Types.ObjectId(verifyId)
        }
      }
    }, {
      fields: {
        verifies: 1
      }
    })
      .then(result => {
        console.log("remove_verify result:", result)
        if (!result) {
          return res.json({
            status: "remove_verify_none"
          })
        }
        const verify = result.verifies.find(ele => ele._id.toString() === verifyId)
        console.log({ verify })
        if (verify && verify.signature) {
          fs.unlink(path.join(signaturePath, verify.signature), err => {
            if (err) {
              console.log("delete file fail:", err)
              return
            }
            console.log("deleted:", path.join(signaturePath, verify.signature))
          })
        }

        return res.json({
          status: "remove_verify_success",
          verify: {
            peaId,
            verifyId
          }
        })
      }).catch(next)
  })


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