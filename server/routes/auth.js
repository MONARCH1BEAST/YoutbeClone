import express from "express";
import { getuserbyid, login, updateprofile, verifyOTP } from "../controllers/auth.js";
const routes = express.Router();

routes.post("/login", login);
routes.post("/verify-otp", verifyOTP);
routes.patch("/update/:id", updateprofile);
routes.get("/:id", getuserbyid);
export default routes;
