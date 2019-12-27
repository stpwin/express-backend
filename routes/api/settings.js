const mongoose = require("mongoose");
const router = require("express").Router();
const auth = require("../auth");
const userController = require("../../controllers/userController");

const Counter = mongoose.model("Counter")
const Customer = mongoose.model("Customer")

router.get(
  "/database/counters",
  auth.required,
  userController.getUser,
  userController.grantAccess("readAny"),
  (req, res, next) => {

    Counter.find({}).then(result => {
      return res.json(result)
    }).catch(error => {
      return res.status(500).json({
        error
      })
    })
  }
);

router.patch(
  "/database/counters",
  auth.required,
  userController.getUser,
  userController.grantAccess("updateAny"),
  (req, res, next) => {
    console.log("SET DATABASE COUNTER SEQUENCE")
    const {
      name,
      sequence
    } = req.body
    console.log({
      name,
      sequence
    })
    if (!name || typeof sequence !== "number" || sequence > 999999) {
      return res.sendStatus(400)
    }

    Counter.findOneAndUpdate({
      _id: name
    }, {
      sequence
    }, {
      upsert: true,
      new: true
    }).then(data => {
      console.log("SET DATABASE COUNTER SEQUENCE: SUCCESS")
      return res.json({
        data,
        status: "set_counter_success"
      })
    }).catch(error => {
      return res.status(500).json({
        error
      })
    })
  }
);


router.get(
  "/database/info",
  auth.required,
  userController.getUser,
  userController.grantAccess("readAny"),
  (req, res, next) => {

    Customer.aggregate([{
        $group: {
          _id: {
            war: "$war"
          },
          count: {
            $sum: 1
          }
        }
      }

    ]).then(result => {
      return res.json(result.map(item => ({
        war: item._id.war,
        count: item.count
      })))
    }).catch(next)


  }
);

module.exports = router;