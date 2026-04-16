import comment from "../Modals/comment.js";
import mongoose from "mongoose";

const COMMENT_BODY_REGEX = /^[\p{L}\p{M}\p{N}\s]+$/u;
const TARGET_LANGUAGE_REGEX = /^[a-z]{2}(-[a-z]{2})?$/i;

const isCommentBodyValid = (value = "") => {
  const normalized = value.trim();
  return Boolean(normalized) && COMMENT_BODY_REGEX.test(normalized);
};

export const postcomment = async (req, res) => {
  const commentdata = req.body;
  const normalizedCommentBody = (commentdata.commentbody || "").trim();
  const normalizedCity = (commentdata.usercity || "").trim();

  if (!mongoose.Types.ObjectId.isValid(commentdata.userid)) {
    return res.status(400).json({ message: "Invalid user id." });
  }

  if (!mongoose.Types.ObjectId.isValid(commentdata.videoid)) {
    return res.status(400).json({ message: "Invalid video id." });
  }

  if (!isCommentBodyValid(normalizedCommentBody)) {
    return res.status(400).json({
      message:
        "Comment contains unsupported special characters. Use letters, numbers, and spaces only.",
    });
  }

  if (!normalizedCity) {
    return res.status(400).json({ message: "City is required for every comment." });
  }

  const postcomment = new comment({
    ...commentdata,
    commentbody: normalizedCommentBody,
    usercity: normalizedCity,
  });

  try {
    const savedComment = await postcomment.save();
    return res.status(200).json({ comment: true, data: savedComment });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getallcomment = async (req, res) => {
  const { videoid } = req.params;
  try {
    const commentvideo = await comment
      .find({ videoid: videoid })
      .sort({ commentedon: -1 });
    return res.status(200).json(commentvideo);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const deletecomment = async (req, res) => {
  const { id: _id } = req.params;
  const { userId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user id." });
  }

  try {
    const removedComment = await comment.findOneAndDelete({
      _id,
      userid: userId,
    });

    if (!removedComment) {
      return res.status(404).json({ message: "comment unavailable" });
    }

    return res.status(200).json({ comment: true });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const editcomment = async (req, res) => {
  const { id: _id } = req.params;
  const { commentbody, userId } = req.body;
  const normalizedCommentBody = (commentbody || "").trim();

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user id." });
  }

  if (!isCommentBodyValid(normalizedCommentBody)) {
    return res.status(400).json({
      message:
        "Comment contains unsupported special characters. Use letters, numbers, and spaces only.",
    });
  }

  try {
    const updatecomment = await comment.findOneAndUpdate(
      { _id, userid: userId },
      {
        $set: { commentbody: normalizedCommentBody },
      },
      { new: true }
    );

    if (!updatecomment) {
      return res.status(404).json({ message: "comment unavailable" });
    }

    return res.status(200).json(updatecomment);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const togglecommentreaction = async (req, res) => {
  const { id: _id } = req.params;
  const { userId, reactionType } = req.body;

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user id." });
  }

  if (!["like", "dislike"].includes(reactionType)) {
    return res
      .status(400)
      .json({ message: "reactionType must be either like or dislike." });
  }

  try {
    const existingComment = await comment.findById(_id);

    if (!existingComment) {
      return res.status(404).json({ message: "comment unavailable" });
    }

    if (existingComment.userid.toString() === userId) {
      return res
        .status(400)
        .json({ message: "You cannot react to your own comment." });
    }

    const hasLiked = existingComment.likedBy.some(
      (id) => id.toString() === userId
    );
    const hasDisliked = existingComment.dislikedBy.some(
      (id) => id.toString() === userId
    );

    if (reactionType === "like") {
      if (hasLiked) {
        existingComment.likedBy = existingComment.likedBy.filter(
          (id) => id.toString() !== userId
        );
      } else {
        existingComment.likedBy.push(userId);
        existingComment.dislikedBy = existingComment.dislikedBy.filter(
          (id) => id.toString() !== userId
        );
      }
    }

    if (reactionType === "dislike") {
      if (hasDisliked) {
        existingComment.dislikedBy = existingComment.dislikedBy.filter(
          (id) => id.toString() !== userId
        );
      } else {
        existingComment.dislikedBy.push(userId);
        existingComment.likedBy = existingComment.likedBy.filter(
          (id) => id.toString() !== userId
        );
      }
    }

    if (existingComment.dislikedBy.length >= 2) {
      await comment.findByIdAndDelete(_id);
      return res.status(200).json({ removed: true, commentId: _id });
    }

    const updatedComment = await existingComment.save();

    return res.status(200).json({
      removed: false,
      commentId: updatedComment._id,
      likes: updatedComment.likedBy.length,
      dislikes: updatedComment.dislikedBy.length,
      liked: updatedComment.likedBy.some((id) => id.toString() === userId),
      disliked: updatedComment.dislikedBy.some((id) => id.toString() === userId),
    });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const translatecomment = async (req, res) => {
  const { text, targetLanguage } = req.body;
  const normalizedText = (text || "").trim();
  const normalizedLanguage = (targetLanguage || "").trim().toLowerCase();

  if (!normalizedText) {
    return res.status(400).json({ message: "Comment text is required." });
  }

  if (!TARGET_LANGUAGE_REGEX.test(normalizedLanguage)) {
    return res.status(400).json({ message: "Invalid target language code." });
  }

  if (typeof fetch !== "function") {
    return res.status(500).json({
      message: "Translation is not supported on this server runtime.",
    });
  }

  try {
    const translationResponse = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(
        normalizedLanguage
      )}&dt=t&q=${encodeURIComponent(normalizedText)}`
    );

    if (!translationResponse.ok) {
      return res
        .status(502)
        .json({ message: "Translation service is currently unavailable." });
    }

    const translationPayload = await translationResponse.json();

    const translatedText = Array.isArray(translationPayload?.[0])
      ? translationPayload[0]
          .map((segment) => (Array.isArray(segment) ? segment[0] : ""))
          .join("")
      : normalizedText;

    return res.status(200).json({ translatedText });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
