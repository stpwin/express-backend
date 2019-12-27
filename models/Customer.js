const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");


const AddressSchema = new mongoose.Schema({
  houseNo: String,
  mooNo: Number,
  districtNo: String
}, {
  timestamps: true
});

const VerifySchema = new mongoose.Schema({
  appearDate: {
    type: Date,
    require: [true, "วันที่แสดงตนไม่ควรว่าง"]
  },
  approvedDate: {
    type: Date,
    default: null
  },
  signature: String,
  state: {
    type: String,
    default: "normal",
    enum: ["normal", "hide"]
  }
}, {
  timestamps: true
});

const CustomerSchema = new mongoose.Schema({
  peaId: {
    type: String,
    unique: true,
    required: [true, "รหัสผู้ใช้ไฟไม่ควรว่าง"],
    min: [12, "รหัสผู้ใช้ไฟไม่ครบ 12 หลัก"],
    max: 12
  },
  title: String,
  firstName: {
    type: String,
    required: [true, "ชื่อไม่ควรว่าง"]
  },
  lastName: {
    type: String,
    required: [true, "นามสกุลไม่ควรว่าง"]
  },
  address: AddressSchema,
  authorize: {
    type: String,
    enum: ["ทหาร", "ตัวแทน", "ภรรยา", "ทายาท"],
    required: [true, "กรณีเป็นไม่ควรว่าง"]
  },
  soldierNo: String,
  war: {
    type: String,
    default: "ภายในประเทศ",
    enum: [
      "ภายในประเทศ", //G1
      "เวียดนาม", //G1
      "เกาหลี", //G1
      "เหรียญชัยสมรภูมิ",
      "เอเชียบูรพา", //G2
      "อินโดจีน", //G2
      "ฝรั่งเศส" //G2
    ],
    required: [true, "สงครามไม่ควรว่าง"]
  },
  verifies: [VerifySchema],
  privilegeDate: Date,
  seq: Number
}, {
  timestamps: true
});

//Needed for full-text search
CustomerSchema.index({
  firstName: "text",
  lastName: "text",
  peaId: "text",
  // seq: "text",
  id: "text"
});

CustomerSchema.plugin(uniqueValidator, {
  message: "รหัสผู้ใช้ไฟซ้ำกับในระบบ"
});

mongoose.model("Verify", VerifySchema);
mongoose.model("Address", AddressSchema);
mongoose.model("Customer", CustomerSchema);