import mongoose from "mongoose";
import crypto from "crypto";
import nodemailer from "nodemailer";
import Razorpay from "razorpay";
import users from "../Modals/Auth.js";

export const PLAN_DETAILS = {
  free: {
    id: "free",
    name: "Free",
    amount: 0,
    currency: "INR",
    watchLimitMinutes: 5,
    rank: 0,
  },
  bronze: {
    id: "bronze",
    name: "Bronze",
    amount: 1000,
    currency: "INR",
    watchLimitMinutes: 7,
    rank: 1,
  },
  silver: {
    id: "silver",
    name: "Silver",
    amount: 5000,
    currency: "INR",
    watchLimitMinutes: 10,
    rank: 2,
  },
  gold: {
    id: "gold",
    name: "Gold",
    amount: 10000,
    currency: "INR",
    watchLimitMinutes: null,
    rank: 3,
  },
};

const PAID_PLAN_IDS = ["bronze", "silver", "gold"];

const getRequestedPlan = (plan = "gold") => {
  const normalizedPlan = String(plan || "gold").toLowerCase();
  return PLAN_DETAILS[normalizedPlan];
};

const getUserPlanId = (user) => {
  if (user?.isPremium && (!user?.plan || user.plan === "free")) {
    return "gold";
  }

  if (user?.plan && PLAN_DETAILS[user.plan]) {
    return user.plan;
  }

  return "free";
};

const getRazorpayInstance = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return null;
  }

  return new Razorpay({ key_id: keyId, key_secret: keySecret });
};

const getInvoiceId = (orderId) =>
  `YT-${String(orderId || Date.now()).slice(-8).toUpperCase()}`;

const formatAmount = (amount, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
  }).format(amount / 100);

const getMailTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
};

const sendPlanInvoiceEmail = async ({
  user,
  plan,
  invoiceId,
  orderId,
  paymentId,
}) => {
  const transporter = getMailTransporter();

  if (!transporter) {
    console.warn("SMTP is not configured. Skipping plan invoice email.");
    return false;
  }

  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  const watchLimit =
    plan.watchLimitMinutes === null
      ? "Unlimited"
      : `${plan.watchLimitMinutes} minutes`;

  await transporter.sendMail({
    from,
    to: user.email,
    subject: `YourTube ${plan.name} plan invoice ${invoiceId}`,
    text: [
      `Invoice: ${invoiceId}`,
      `Plan: ${plan.name}`,
      `Amount: ${formatAmount(plan.amount, plan.currency)}`,
      `Watch limit: ${watchLimit}`,
      `Razorpay order: ${orderId}`,
      `Razorpay payment: ${paymentId}`,
      "Your plan is active on your YourTube account.",
    ].join("\n"),
    html: `
      <h2>YourTube plan invoice</h2>
      <p>Your ${plan.name} plan is active.</p>
      <table cellpadding="8" cellspacing="0" border="1">
        <tr><td>Invoice</td><td>${invoiceId}</td></tr>
        <tr><td>Plan</td><td>${plan.name}</td></tr>
        <tr><td>Amount</td><td>${formatAmount(plan.amount, plan.currency)}</td></tr>
        <tr><td>Watch limit</td><td>${watchLimit}</td></tr>
        <tr><td>Razorpay order</td><td>${orderId}</td></tr>
        <tr><td>Razorpay payment</td><td>${paymentId}</td></tr>
      </table>
    `,
  });

  return true;
};

export const createpremiumorder = async (req, res) => {
  const { userId, plan = "gold" } = req.body;
  const requestedPlan = getRequestedPlan(plan);

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user id." });
  }

  if (!requestedPlan || !PAID_PLAN_IDS.includes(requestedPlan.id)) {
    return res.status(400).json({ message: "Invalid paid plan selected." });
  }

  const razorpay = getRazorpayInstance();

  if (!razorpay) {
    return res.status(500).json({
      message:
        "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
    });
  }

  try {
    const existingUser = await users.findById(userId);

    if (!existingUser) {
      return res.status(404).json({ message: "User unavailable." });
    }

    const currentPlan = PLAN_DETAILS[getUserPlanId(existingUser)];

    if (currentPlan.rank >= requestedPlan.rank) {
      return res.status(200).json({
        alreadyPremium: true,
        alreadyOnPlan: true,
        user: existingUser,
        plan: currentPlan,
      });
    }

    const order = await razorpay.orders.create({
      amount: requestedPlan.amount,
      currency: requestedPlan.currency,
      receipt: `plan_${requestedPlan.id}_${userId}_${Date.now()}`.slice(0, 40),
      notes: {
        userId,
        plan: requestedPlan.id,
      },
    });

    return res.status(200).json({
      order,
      keyId: process.env.RAZORPAY_KEY_ID,
      amount: requestedPlan.amount,
      currency: requestedPlan.currency,
      plan: requestedPlan,
    });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const verifypremiumpayment = async (req, res) => {
  const {
    userId,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  } = req.body;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user id." });
  }

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ message: "Payment details are required." });
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keySecret) {
    return res.status(500).json({
      message:
        "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
    });
  }

  try {
    const generatedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ message: "Invalid payment signature." });
    }

    const razorpay = getRazorpayInstance();
    const order = razorpay ? await razorpay.orders.fetch(razorpay_order_id) : null;
    const requestedPlan = getRequestedPlan(order?.notes?.plan);

    if (!requestedPlan || String(order?.notes?.userId) !== String(userId)) {
      return res.status(400).json({ message: "Payment order details are invalid." });
    }

    const existingUser = await users.findById(userId);

    if (!existingUser) {
      return res.status(404).json({ message: "User unavailable." });
    }

    const invoiceId = getInvoiceId(razorpay_order_id);
    const activatedAt = new Date();
    const updatedUser = await users.findByIdAndUpdate(
      userId,
      {
        $set: {
          isPremium: true,
          plan: requestedPlan.id,
          planActivatedOn: activatedAt,
          planOrderId: razorpay_order_id,
          planPaymentId: razorpay_payment_id,
          planAmount: requestedPlan.amount,
          planCurrency: requestedPlan.currency,
          planInvoiceId: invoiceId,
          premiumActivatedOn: activatedAt,
          premiumOrderId: razorpay_order_id,
          premiumPaymentId: razorpay_payment_id,
        },
      },
      { new: true }
    );

    let emailSent = false;
    try {
      emailSent = await sendPlanInvoiceEmail({
        user: updatedUser,
        plan: requestedPlan,
        invoiceId,
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
      });
    } catch (emailError) {
      console.error("Invoice email error:", emailError);
    }

    return res.status(200).json({
      success: true,
      message: `${requestedPlan.name} plan activated successfully.`,
      emailSent,
      invoiceId,
      plan: requestedPlan,
      user: updatedUser,
    });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getpremiumstatus = async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user id." });
  }

  try {
    const existingUser = await users.findById(userId);

    if (!existingUser) {
      return res.status(404).json({ message: "User unavailable." });
    }

    const currentPlan = PLAN_DETAILS[getUserPlanId(existingUser)];

    return res.status(200).json({
      isPremium: Boolean(existingUser.isPremium),
      premiumActivatedOn: existingUser.premiumActivatedOn || null,
      plan: currentPlan,
      plans: PLAN_DETAILS,
      planActivatedOn: existingUser.planActivatedOn || null,
      invoiceId: existingUser.planInvoiceId || null,
    });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
