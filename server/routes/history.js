import express from "express";
import {
  deletehistory,
  getallhistoryVideo,
  handlehistory,
  handleview,
} from "../controllers/history.js";

const routes = express.Router();
routes.get("/:userId", getallhistoryVideo);
routes.delete("/:id", deletehistory);
routes.post("/views/:videoId", handleview);
routes.post("/:videoId", handlehistory);
export default routes;
