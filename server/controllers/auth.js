import mongoose from "mongoose";
import users from "../Modals/Auth.js";
import nodemailer from "nodemailer";
import twilio from "twilio";
import fetch from "node-fetch"; // assuming installed, or use built-in

// Configure nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Configure Twilio
const twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

const southStates = ["Tamil Nadu", "Kerala", "Karnataka", "Andhra Pradesh", "Telangana"];

const getLocation = async (ip) => {
  try {
    const response = await fetch(`http://ip-api.com/json/${ip}`);
    const data = await response.json();
    return data.regionName; // state
  } catch (error) {
    console.error("Geolocation error:", error);
    return null;
  }
};

const isLightTheme = (time, state) => {
  const hour = time.getHours();
  const isTime = hour >= 10 && hour < 12;
  const isSouth = southStates.includes(state);
  return isTime && isSouth;
};

const sendOTP = async (contact, isEmail, otp) => {
  if (isEmail) {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: contact,
      subject: "OTP Verification",
      text: `Your OTP is ${otp}`,
    };
    await transporter.sendMail(mailOptions);
  } else {
    await twilioClient.messages.create({
      body: `Your OTP is ${otp}`,
      from: process.env.TWILIO_PHONE,
      to: contact,
    });
  }
};

export const login = async (req, res) => {
  const { email, name, image, mobile } = req.body;

  if (!email || !mobile) {
    return res.status(400).json({ message: "Email and mobile are required." });
  }

  try {
    const existingUser = await users.findOne({ email });

    let user;
    if (!existingUser) {
      user = await users.create({ email, name, image, mobile });
    } else {
      user = existingUser;
      // Update mobile if not set
      if (!user.mobile) {
        user.mobile = mobile;
        await user.save();
      }
    }

    // Get IP
    const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    const state = await getLocation(ip);

    // Get current time in IST
    const now = new Date();
    const istTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));

    const theme = isLightTheme(istTime, state) ? "light" : "dark";

    // Decide OTP method
    const isSouth = southStates.includes(state);
    const otpMethod = isSouth ? "email" : "mobile";
    const contact = isSouth ? email : mobile;

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Send OTP
    await sendOTP(contact, isSouth, otp);

    // Store OTP temporarily, perhaps in user or session
    // For simplicity, add otp field to user
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 min
    await user.save();

    return res.status(200).json({ result: user, theme, otpMethod });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required." });
  }

  try {
    const user = await users.findOne({ email });

    if (!user || user.otp !== otp || user.otpExpires < new Date()) {
      return res.status(400).json({ message: "Invalid or expired OTP." });
    }

    // Clear OTP
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    return res.status(200).json({ result: user });
  } catch (error) {
    console.error("OTP verification error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getuserbyid = async (req, res) => {
  const { id: _id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(400).json({ message: "Invalid user id." });
  }

  try {
    const existingUser = await users.findById(_id);

    if (!existingUser) {
      return res.status(404).json({ message: "User unavailable." });
    }

    return res.status(200).json(existingUser);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const updateprofile = async (req, res) => {
  const { id: _id } = req.params;
  const { channelname, description } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(400).json({ message: "Invalid user id." });
  }
  if (!String(channelname || "").trim()) {
    return res.status(400).json({ message: "Channel name is required." });
  }
  try {
    const updatedata = await users.findByIdAndUpdate(
      _id,
      {
        $set: {
          channelname: String(channelname).trim(),
          description: String(description || "").trim(),
        },
      },
      { new: true }
    );

    if (!updatedata) {
      return res.status(404).json({ message: "User unavailable." });
    }

    return res.status(201).json(updatedata);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
