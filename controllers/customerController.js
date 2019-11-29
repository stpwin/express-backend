const mongoose = require("mongoose");
const Customer = mongoose.model("Customer");

exports.getCustomerByPeaId = async (req, res, next) => {
  const peaId = req.params.peaId;
  if (!peaId) {
    return res.status(400).json({
      error: "Bad request"
    });
  }

  Customer.findOne({ peaId: peaId })
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

exports.checkVerifyBody = async (req, res, next) => {
  const verifyData = req.body.verify;
  if (!verifyData) {
    return res.status(400).json({
      error: "Bad request: No verify data"
    });
  }
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
