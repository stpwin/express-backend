const mongoose = require("mongoose");
const router = require("express").Router();
const auth = require("../auth");
const userController = require("../../controllers/userController");

const Counter = mongoose.model("Counter");
const Customer = mongoose.model("Customer");

router.get(
  "/database/counters",
  auth.required,
  userController.getUser,
  userController.grantAccess("readAny"),
  (req, res, next) => {
    Counter.find({})
      .then(result => {
        return res.json(result);
      })
      .catch(error => {
        return res.status(500).json({
          error
        });
      });
  }
);

router.patch(
  "/database/counters",
  auth.required,
  userController.getUser,
  userController.grantAccess("updateAny"),
  (req, res, next) => {
    console.log("SET DATABASE COUNTER SEQUENCE");
    const { name, sequence } = req.body;
    console.log({
      name,
      sequence
    });
    if (!name || typeof sequence !== "number" || sequence > 999999) {
      return res.sendStatus(400);
    }

    Counter.findOneAndUpdate(
      {
        _id: name
      },
      {
        sequence
      },
      {
        upsert: true,
        new: true
      }
    )
      .then(data => {
        console.log("SET DATABASE COUNTER SEQUENCE: SUCCESS");
        return res.json({
          data,
          status: "set_counter_success"
        });
      })
      .catch(error => {
        return res.status(500).json({
          error
        });
      });
  }
);

// const start = new Date(new Date().getUTCFullYear() - 1, 1, 1)
// const end = new Date(new Date().getUTCFullYear(), 1, 1)
// const ccc = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
// console.log({ start: start, end: end, ccc })

router.get(
  "/database/info",
  auth.required,
  userController.getUser,
  userController.grantAccess("readAny"),
  (req, res, next) => {
    const tempDate = new Date();
    const start = new Date(tempDate.getUTCFullYear() - 1, 1, 1);
    const end = new Date(tempDate.getUTCFullYear(), 1, 1);
    console.log({
      start: start.toLocaleString(),
      end: end.toLocaleString()
    });
    const startToday = new Date(tempDate.setUTCHours(0, 0, 0, 0));
    const endToday = new Date(tempDate.setUTCHours(23, 59, 59, 999));
    Customer.aggregate([
      {
        $facet: {
          warWithCount: [
            {
              $group: {
                _id: "$war",
                count: {
                  $sum: 1
                }
              }
            }
          ],
          warWithAppearCount: [
            {
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
          warWithApprovedCount: [
            {
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
          todayAppear: [
            {
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
            },
            {
              $group: {
                _id: "$war",
                todayAppear: {
                  $sum: 1
                }
              }
            }
          ],
          todayApproved: [
            {
              $match: {
                verifies: {
                  $elemMatch: {
                    approvedDate: {
                      $gte: startToday,
                      $lt: endToday
                    }
                  }
                }
              }
            },
            {
              $group: {
                _id: "$war",
                todayApproved: {
                  $sum: 1
                }
              }
            }
          ]
        }
      },
      {
        $project: {
          activity: {
            $setUnion: [
              "$warWithCount",
              "$warWithAppearCount",
              "$warWithApprovedCount",
              "$todayAppear",
              "$todayApproved"
            ]
          }
        }
      },
      {
        $unwind: "$activity"
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
          todayAppear: {
            $sum: "$todayAppear"
          },
          todayApproved: {
            $sum: "$todayApproved"
          }
        }
      }
    ])
      .then(result => {
        // console.log(result)
        return res.json(
          result.map(item => ({
            war: item._id,
            count: item.count,
            appearCount: item.appearCount,
            approvedCount: item.approvedCount,
            todayAppear: item.todayAppear,
            todayApproved: item.todayApproved
          }))
        );
      })
      .catch(next);
  }
);

router.get(
  "/database/verifyinfo",
  auth.required,
  userController.getUser,
  userController.grantAccess("readAny"),
  (req, res, next) => {
    const { date, betweenStart, betweenEnd } = req.query;
    const tempDate = new Date();

    let _date = new Date();
    if (date) {
      _date = new Date(date);
    }
    _date.setUTCHours(0, 0, 0, 0);

    let start = new Date(tempDate.getUTCFullYear() - 1, 1, 1);
    let end = new Date(tempDate.getUTCFullYear(), 1, 1);
    if (betweenStart && betweenEnd) {
      start = new Date(betweenStart);
      end = new Date(betweenEnd);
    }

    const startToday = _date;
    const endToday = new Date(
      _date.getUTCFullYear(),
      _date.getUTCMonth(),
      _date.getUTCDate(),
      23,
      59,
      59,
      999
    );

    Customer.aggregate([
      {
        $facet: {
          warWithCount: [
            {
              $group: {
                _id: "$war",
                count: {
                  $sum: 1
                }
              }
            }
          ],
          warWithAppearCount: [
            {
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
          warWithApprovedCount: [
            {
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
          todayAppear: [
            {
              $match: {
                verifies: {
                  $elemMatch: {
                    appearDate: {
                      $gte: startToday,
                      $lte: endToday
                    }
                  }
                }
              }
            },
            {
              $group: {
                _id: "$war",
                todayAppear: {
                  $sum: 1
                }
              }
            }
          ],
          todayApproved: [
            {
              $match: {
                verifies: {
                  $elemMatch: {
                    approvedDate: {
                      $gte: startToday,
                      $lte: endToday
                    }
                  }
                }
              }
            },
            {
              $group: {
                _id: "$war",
                todayApproved: {
                  $sum: 1
                }
              }
            }
          ]
        }
      },
      {
        $project: {
          activity: {
            $setUnion: [
              "$warWithCount",
              "$warWithAppearCount",
              "$warWithApprovedCount",
              "$todayAppear",
              "$todayApproved"
            ]
          }
        }
      },
      {
        $unwind: "$activity"
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
          todayAppear: {
            $sum: "$todayAppear"
          },
          todayApproved: {
            $sum: "$todayApproved"
          }
        }
      }
    ])
      .then(result => {
        // console.log(result)
        return res.json(
          result.map(item => ({
            war: item._id,
            count: item.count,
            appearCount: item.appearCount,
            approvedCount: item.approvedCount,
            todayAppear: item.todayAppear,
            todayApproved: item.todayApproved
          }))
        );
      })
      .catch(next);
  }
);

module.exports = router;
