const mongoose = require("mongoose");
const Customer = mongoose.model("Customer");

exports.getCustomerByPeaId = async (req, res, next) => {
  const { peaId } = req.params;
  if (!peaId) {
    return res.status(400).json({
      error: "Bad request"
    });
  }

  Customer.findOne({ peaId: peaId }, { verifies: { $slice: -6 } })
    .then(customer => {
      if (!customer) {
        return res.status(204).json({
          error: "No customer found!"
        });
      }
      req.customer = customer;
      next();
    })
    .catch(next);
};

exports.getCustomerSignature = async (req, res, next) => {
  const { peaId, verifyId } = req.params;
  if (!peaId || !verifyId) {
    return res.status(400).json({
      error: "Bad request"
    });
  }

  Customer.aggregate(
    [
      {
        $match: { peaId: peaId }
      },
      {
        $unwind: "$verifies"
      },
      {
        $match: {
          "verifies._id": mongoose.Types.ObjectId(verifyId)
        }
      },
      {
        $group: {
          dateAppear: {
            $first: "$dateAppear"
          }
        }
      }
    ],
    (err, result) => {
      console.log(result);
    }
  );

  // Customer.findOne({
  //   peaId: peaId,
  //   verifies: { $elemMatch: { _id: mongoose.Types.ObjectId(verifyId) } }
  // })
  //   .select("verifies")
  //   .then(customer => {
  //     if (!customer) {
  //       return res.status(204).json({
  //         error: "No customer found!"
  //       });
  //     }
  //     req.customer = customer;
  //     next();
  //   })
  //   .catch(next);
};

exports.checkVerifyBody = async (req, res, next) => {
  // const verifyData = req.body.verify;

  const dateAppear = req.body.dateAppear
    ? new Date(JSON.parse(req.body.dateAppear))
    : null;
  const privilegeDate = req.body.privilegeDate
    ? new Date(JSON.parse(req.body.privilegeDate))
    : null;

  console.log(dateAppear, privilegeDate);
  if (!(dateAppear && privilegeDate)) {
    return res.status(400).json({
      error: "Bad request: No verify data"
    });
  }
  res.verify = { dateAppear, privilegeDate };
  next();
};

exports.checkUpdateBody = async (req, res, next) => {
  const customerData = req.body.customer;
  if (!customerData) {
    return res.status(400).json({
      error: "Bad request"
    });
  }
  next();
};
