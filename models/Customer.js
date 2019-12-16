const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const AddressSchema = new mongoose.Schema({
  houseNo: String,
  mooNo: Number,
  districtNo: String
});

const VerifySchema = new mongoose.Schema({
  appearDate: {
    type: Date,
    require: [true, "can't be blank"],
    default: Date.now
  },
  privilegeDate: { type: Date, require: [true, "can't be blank"] },
  signature: { type: String, require: [true, "can't be blank"] }
});

const CustomerSchema = new mongoose.Schema(
  {
    title: String,
    firstName: {
      type: String,
      required: [true, "can't be blank"]
      // index: true
    },
    lastName: {
      type: String,
      required: [true, "can't be blank"]
      // index: true
    },
    peaId: {
      type: String,
      unique: true,
      required: [true, "can't be blank"]
      // index: true
    },
    address: AddressSchema,
    authorize: {
      type: String,
      enum: ["ทหาร", "ตัวแทน", "ภรรยา", "ทายาท"],
      required: [true, "can't be blank"]
    },
    soldierNo: String,
    war: {
      type: String,
      enum: [
        "ภายในประเทศ", //G1
        "เวียดนาม", //G1
        "เกาหลี", //G1
        "เอเชียบูรพา", //G2
        "อินโดจีน", //G2
        "ฝรั่งเศส" //G2
      ],
      required: [true, "can't be blank"]
      // index: true
    },
    verifies: [VerifySchema]
  },
  { timestamps: true }
);

//Needed for full-text search
CustomerSchema.index({ firstName: "text", lastName: "text", peaId: "text" });

CustomerSchema.plugin(uniqueValidator, { message: "is already taken." });

mongoose.model("Verify", VerifySchema);
mongoose.model("Address", AddressSchema);
mongoose.model("Customer", CustomerSchema);
