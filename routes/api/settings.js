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
    const tempDate = new Date();
    const start = new Date(tempDate.getFullYear(), 0, 1)
    const end = new Date(tempDate.getFullYear(), 11, 31)
    const startToday = new Date(tempDate.setUTCHours(0, 0, 0, 0))
    const endToday = new Date(tempDate.setUTCHours(23, 59, 59, 999))
    Customer.aggregate([{
        $facet: {
          warWithCount: [{
            $group: {
              _id: "$war",
              count: {
                $sum: 1
              }
            }
          }],
          warWithAppearCount: [{
              $match: {
                verifies: {
                  $elemMatch: {
                    appearDate: {
                      $gte: start,
                      $lt: end
                    }
                  }
                }
              }
            },
            {
              $group: {
                _id: "$war",
                appearCount: {
                  $sum: 1
                }
              }
            }
          ],
          warWithApprovedCount: [{
              $match: {
                verifies: {
                  $elemMatch: {
                    approvedDate: {
                      $gte: start,
                      $lt: end
                    }
                  }
                }
              }
            },
            {
              $group: {
                _id: "$war",
                approvedCount: {
                  $sum: 1
                }
              }
            }
          ],
          today: [{
            $match: {
              verifies: {
                $elemMatch: {
                  appearDate: {
                    $gte: startToday,
                    $lt: endToday
                  }
                }
              }
            }
          }, {
            $group: {
              _id: "$war",
              today: {
                $sum: 1
              }
            }
          }]
        }
      },
      {
        $project: {
          activity: {
            $setUnion: ['$warWithCount', '$warWithAppearCount', '$warWithApprovedCount', "$today"]
          }
        }
      },
      {
        $unwind: '$activity'
      },
      {
        $replaceRoot: {
          newRoot: "$activity"
        }
      },
      {
        $group: {
          _id: "$_id",
          count: {
            $sum: "$count"
          },
          appearCount: {
            $sum: "$appearCount"
          },
          approvedCount: {
            $sum: "$approvedCount"
          },
          today: {
            $sum: "$today"
          }
        }
      }

    ]).then(result => {
      console.log(result)
      return res.json(result.map(item => ({
        war: item._id,
        count: item.count,
        appearCount: item.appearCount,
        approvedCount: item.approvedCount,
        today: item.today
      })))
    }).catch(next)


  }
);

module.exports = router;