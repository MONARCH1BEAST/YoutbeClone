import crypto from "crypto";

const calls = {};

const findCall = (roomId) => calls[roomId];

export const createCallRoom = (req, res) => {
  const roomId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(8).toString("hex");
  calls[roomId] = {
    offer: null,
    answer: null,
    callerCandidates: [],
    calleeCandidates: [],
    createdAt: new Date(),
  };
  return res.status(201).json({ roomId });
};

export const postOffer = (req, res) => {
  const { roomId, offer } = req.body;
  if (!roomId || !offer) {
    return res.status(400).json({ message: "roomId and offer are required." });
  }
  const call = findCall(roomId);
  if (!call) {
    return res.status(404).json({ message: "Call room not found." });
  }
  call.offer = offer;
  return res.status(200).json({ ok: true });
};

export const getOffer = (req, res) => {
  const { roomId } = req.params;
  const call = findCall(roomId);
  if (!call || !call.offer) {
    return res.status(404).json({ message: "Offer not available." });
  }
  return res.status(200).json({ offer: call.offer });
};

export const postAnswer = (req, res) => {
  const { roomId, answer } = req.body;
  if (!roomId || !answer) {
    return res.status(400).json({ message: "roomId and answer are required." });
  }
  const call = findCall(roomId);
  if (!call) {
    return res.status(404).json({ message: "Call room not found." });
  }
  call.answer = answer;
  return res.status(200).json({ ok: true });
};

export const getAnswer = (req, res) => {
  const { roomId } = req.params;
  const call = findCall(roomId);
  if (!call || !call.answer) {
    return res.status(404).json({ message: "Answer not available." });
  }
  return res.status(200).json({ answer: call.answer });
};

export const postCandidate = (req, res) => {
  const { roomId, candidate, role } = req.body;
  if (!roomId || !candidate || !role) {
    return res.status(400).json({ message: "roomId, candidate, and role are required." });
  }
  const call = findCall(roomId);
  if (!call) {
    return res.status(404).json({ message: "Call room not found." });
  }
  if (role === "caller") {
    call.callerCandidates.push(candidate);
  } else {
    call.calleeCandidates.push(candidate);
  }
  return res.status(200).json({ ok: true });
};

export const getCandidates = (req, res) => {
  const { roomId } = req.params;
  const forRole = req.query.for;
  const call = findCall(roomId);
  if (!call) {
    return res.status(404).json({ message: "Call room not found." });
  }

  if (forRole !== "caller" && forRole !== "callee") {
    return res.status(400).json({ message: "Query parameter for must be caller or callee." });
  }

  const candidates = forRole === "caller" ? [...call.calleeCandidates] : [...call.callerCandidates];
  if (forRole === "caller") {
    call.calleeCandidates = [];
  } else {
    call.callerCandidates = [];
  }
  return res.status(200).json({ candidates });
};
