import mongoose from "mongoose";
const userschema = mongoose.Schema({
  email: { type: String, required: true },
  name: { type: String },
  mobile: { type: String },
  channelname: { type: String },
  description: { type: String },
  image: { type: String },
  otp: { type: String },
  otpExpires: { type: Date },
  isPremium: { type: Boolean, default: false },
  plan: {
    type: String,
    enum: ["free", "bronze", "silver", "gold"],
    default: "free",
  },
  planActivatedOn: { type: Date, default: null },
  planOrderId: { type: String, default: null },
  planPaymentId: { type: String, default: null },
  planAmount: { type: Number, default: 0 },
  planCurrency: { type: String, default: "INR" },
  planInvoiceId: { type: String, default: null },
  premiumActivatedOn: { type: Date, default: null },
  premiumOrderId: { type: String, default: null },
  premiumPaymentId: { type: String, default: null },
  joinedon: { type: Date, default: Date.now },
});

export default mongoose.model("user", userschema);
