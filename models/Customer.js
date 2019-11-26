const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const AddressSchema = new mongoose.Schema({
  houseNo: String,
  // village: String,
  // roomNo: String,
  // classNo: String,
  mooNo: Number,
  // alleyway: String,
  // soi: String,
  districtNo: String
});

const CustomerSchema = new mongoose.Schema(
  {
    title: String,
    firstName: { type: String, required: [true, "can't be blank"] },
    lastName: { type: String, required: [true, "can't be blank"] },
    peaId: {
      type: String,
      unique: true,
      required: [true, "can't be blank"],
      index: true
    },
    dateAppear: [{ type: Date, default: Date.now }],
    address: AddressSchema,
    authorize: { type: String, enum: ["ทหาร", "ตัวแทน", "ภรรยา", "ทายาท"] },
    soldierNo: String,
    war: {
      type: String,
      enum: [
        "ภายในประเทศ",
        "เวียดนาม",
        "เกาหลี",
        "เอเชียบูรพา",
        "อินโดจีน",
        "ฝรั่งเศส"
      ]
    },
    signature: String
  },
  { timestamps: true }
);

CustomerSchema.plugin(uniqueValidator, { message: "is already taken." });

mongoose.model("Address", AddressSchema);
mongoose.model("Customer", CustomerSchema);
