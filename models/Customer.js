const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

// const
//   MongooseAutoIncrementID = require('mongoose-auto-increment-reworked').MongooseAutoIncrementID;
// MongooseAutoIncrementID.initialise('no');

const CounterSchema = new mongoose.Schema({
  "_id": { type: String, required: true },
  "sequence": { type: Number, default: 0 }
})

const AddressSchema = new mongoose.Schema({
  houseNo: String,
  mooNo: Number,
  districtNo: String
});

const VerifySchema = new mongoose.Schema({
  appearDate: {
    type: Date,
    require: [true, "วันที่แสดงตนไม่ควรว่าง"]
  },
  signature: String
});

const CustomerSchema = new mongoose.Schema({
  title: String,
  no: {
    type: Number,
    // required: true
  },
  firstName: {
    type: String,
    required: [true, "ชื่อไม่ควรว่าง"]
    // index: true
  },
  lastName: {
    type: String,
    required: [true, "นามสกุลไม่ควรว่าง"]
    // index: true
  },
  peaId: {
    type: String,
    unique: true,
    required: [true, "รหัสผู้ใช้ไฟไม่ควรว่าง"]
    // index: true
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
      "เอเชียบูรพา", //G2
      "อินโดจีน", //G2
      "ฝรั่งเศส" //G2
    ],
    required: [true, "สงครามไม่ควรว่าง"]
    // index: true
  },
  verifies: [VerifySchema],
  privilegeDate: Date,
  seq: { type: Number }
}, {
  timestamps: true
});

//Needed for full-text search
CustomerSchema.index({
  firstName: "text",
  lastName: "text",
  peaId: "text",
  id: "text"
});

CustomerSchema.plugin(uniqueValidator, {
  message: "รหัสผู้ใช้ไฟซ้ำกับในระบบ"
});

// const plugin = new MongooseAutoIncrementID(CustomerSchema, "Customer", {
//   field: "no",
//   startAt: 1,
//   unique: true
// })

// plugin.applyPlugin()
//   .then(() => {
//     console.log("Mongose Auto Increment ready to use!")
//   })
//   .catch(e => {
//     console.error("Mongose Auto Increment failed to initialise!")
//   });

// CustomerSchema.plugin(MongooseAutoIncrementID.plugin, {
//   modelName: 'Customer'
// })

mongoose.model("Counter", CounterSchema)
mongoose.model("Verify", VerifySchema);
mongoose.model("Address", AddressSchema);
mongoose.model("Customer", CustomerSchema);