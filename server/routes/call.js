import express from "express";
import {
  createCallRoom,
  postOffer,
  getOffer,
  postAnswer,
  getAnswer,
  postCandidate,
  getCandidates,
} from "../controllers/call.js";

const router = express.Router();

router.post("/create", createCallRoom);
router.post("/offer", postOffer);
router.get("/offer/:roomId", getOffer);
router.post("/answer", postAnswer);
router.get("/answer/:roomId", getAnswer);
router.post("/candidate", postCandidate);
router.get("/candidates/:roomId", getCandidates);

export default router;
