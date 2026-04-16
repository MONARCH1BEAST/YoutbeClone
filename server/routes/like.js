import express from "express";
import { getallLikedVideo, handledislike, handlelike } from "../controllers/like.js";

const routes = express.Router();
routes.get("/:userId", getallLikedVideo);
routes.post("/dislike/:videoId", handledislike);
routes.post("/:videoId", handlelike);
export default routes;
