import express from "express";
import {
  downloadfile,
  getalldownloads,
  getdownloadstatus,
  requestdownload,
} from "../controllers/download.js";

const routes = express.Router();

routes.get("/status/:userId", getdownloadstatus);
routes.get("/file/:downloadId", downloadfile);
routes.get("/:userId", getalldownloads);
routes.post("/request/:videoId", requestdownload);

export default routes;
