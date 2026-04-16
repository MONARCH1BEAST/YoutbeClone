import express from "express";
import {
  createpremiumorder,
  getpremiumstatus,
  verifypremiumpayment,
} from "../controllers/premium.js";

const routes = express.Router();

routes.get("/status/:userId", getpremiumstatus);
routes.post("/create-order", createpremiumorder);
routes.post("/verify", verifypremiumpayment);

export default routes;
