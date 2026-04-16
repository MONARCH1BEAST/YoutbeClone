import video from "../Modals/video.js";
import like from "../Modals/like.js";
import dislike from "../Modals/dislike.js";
import mongoose from "mongoose";

export const handlelike = async (req, res) => {
  const { userId } = req.body;
  const { videoId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user id." });
  }

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    return res.status(400).json({ message: "Invalid video id." });
  }

  try {
    const existingVideo = await video.findById(videoId);

    if (!existingVideo) {
      return res.status(404).json({ message: "Video unavailable." });
    }

    const exisitinglike = await like.findOne({
      viewer: userId,
      videoid: videoId,
    });
    if (exisitinglike) {
      await like.findByIdAndDelete(exisitinglike._id);
      await video.findOneAndUpdate(
        { _id: videoId, Like: { $gt: 0 } },
        { $inc: { Like: -1 } }
      );
      return res.status(200).json({ liked: false });
    } else {
      await like.create({ viewer: userId, videoid: videoId });
      const existingDislike = await dislike.findOne({
        viewer: userId,
        videoid: videoId,
      });

      if (existingDislike) {
        await dislike.findByIdAndDelete(existingDislike._id);
      }

      await video.findByIdAndUpdate(videoId, { $inc: { Like: 1 } });

      if (existingDislike) {
        await video.findOneAndUpdate(
          { _id: videoId, Dislike: { $gt: 0 } },
          { $inc: { Dislike: -1 } }
        );
      }
      return res.status(200).json({ liked: true });
    }
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const handledislike = async (req, res) => {
  const { userId } = req.body;
  const { videoId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user id." });
  }

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    return res.status(400).json({ message: "Invalid video id." });
  }

  try {
    const existingVideo = await video.findById(videoId);

    if (!existingVideo) {
      return res.status(404).json({ message: "Video unavailable." });
    }

    const existingDislike = await dislike.findOne({
      viewer: userId,
      videoid: videoId,
    });

    if (existingDislike) {
      await dislike.findByIdAndDelete(existingDislike._id);
      await video.findOneAndUpdate(
        { _id: videoId, Dislike: { $gt: 0 } },
        { $inc: { Dislike: -1 } }
      );
      return res.status(200).json({ disliked: false });
    }

    const existingLike = await like.findOne({ viewer: userId, videoid: videoId });

    if (existingLike) {
      await like.findByIdAndDelete(existingLike._id);
    }

    await dislike.create({ viewer: userId, videoid: videoId });
    await video.findByIdAndUpdate(videoId, { $inc: { Dislike: 1 } });

    if (existingLike) {
      await video.findOneAndUpdate(
        { _id: videoId, Like: { $gt: 0 } },
        { $inc: { Like: -1 } }
      );
    }

    return res.status(200).json({ disliked: true, removedLike: Boolean(existingLike) });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getallLikedVideo = async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user id." });
  }

  try {
    const likevideo = await like
      .find({ viewer: userId })
      .populate({
        path: "videoid",
        model: "videofiles",
      })
      .sort({ updatedAt: -1 })
      .exec();
    return res.status(200).json(likevideo);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
