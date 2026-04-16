import express from "express";
import {
  deletecomment,
  editcomment,
  getallcomment,
  postcomment,
  togglecommentreaction,
  translatecomment,
} from "../controllers/comment.js";

const routes = express.Router();
routes.get("/:videoid", getallcomment);
routes.post("/postcomment", postcomment);
routes.delete("/deletecomment/:id", deletecomment);
routes.post("/editcomment/:id", editcomment);
routes.post("/react/:id", togglecommentreaction);
routes.post("/translate", translatecomment);

export default routes;
