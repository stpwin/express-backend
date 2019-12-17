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
      customer.verifies.sort((a, b) => {
        return new Date(b.appearDate) - new Date(a.appearDate);
      });
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
        $unwind: "$verifies"
      },
      {
        $match: {
          peaId: peaId,
          "verifies._id": mongoose.Types.ObjectId(verifyId)
        }
      },
      {
        $group: {
          _id: "$verifies._id",
          signature: { $first: "$verifies.signature" }
        }
      }
    ],
    (err, result) => {
      if (err) {
        next(err);
      }

      if (result) {
        req.signature = result[0].signature;
      }
      next();
    }
  );
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
