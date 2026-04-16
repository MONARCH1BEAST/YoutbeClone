import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import download from "../Modals/download.js";
import users from "../Modals/Auth.js";
import video from "../Modals/video.js";

const FREE_DAILY_DOWNLOAD_LIMIT = 1;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDirectory = path.resolve(__dirname, "..", "uploads");

const getTodayRange = () => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  return { startOfDay, endOfDay };
};

export const requestdownload = async (req, res) => {
  const { videoId } = req.params;
  const { userId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    return res.status(400).json({ message: "Invalid video id." });
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user id." });
  }

  try {
    const [existingUser, existingVideo] = await Promise.all([
      users.findById(userId),
      video.findById(videoId),
    ]);

    if (!existingUser) {
      return res.status(404).json({ message: "User unavailable." });
    }

    if (!existingVideo) {
      return res.status(404).json({ message: "Video unavailable." });
    }

    const existingDownload = await download.findOne({
      viewer: userId,
      videoid: videoId,
    });

    if (existingDownload) {
      return res.status(200).json({
        download: true,
        alreadyDownloaded: true,
        downloadId: existingDownload._id,
        isPremium: existingUser.isPremium,
        remainingDownloads: existingUser.isPremium ? null : undefined,
      });
    }

    let downloadsToday = 0;

    if (!existingUser.isPremium) {
      const { startOfDay, endOfDay } = getTodayRange();
      downloadsToday = await download.countDocuments({
        viewer: userId,
        downloadedon: { $gte: startOfDay, $lte: endOfDay },
      });

      if (downloadsToday >= FREE_DAILY_DOWNLOAD_LIMIT) {
        return res.status(403).json({
          code: "DAILY_LIMIT_EXCEEDED",
          message:
            "Free users can download only one video per day. Upgrade to Premium for unlimited downloads.",
        });
      }
    }

    const downloadRecord = await download.create({
      viewer: userId,
      videoid: videoId,
    });

    return res.status(200).json({
      download: true,
      downloadId: downloadRecord._id,
      isPremium: existingUser.isPremium,
      remainingDownloads: existingUser.isPremium
        ? null
        : Math.max(0, FREE_DAILY_DOWNLOAD_LIMIT - (downloadsToday + 1)),
    });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getalldownloads = async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user id." });
  }

  try {
    const downloads = await download
      .find({ viewer: userId })
      .populate({
        path: "videoid",
        model: "videofiles",
      })
      .sort({ downloadedon: -1 })
      .exec();

    return res.status(200).json(downloads);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getdownloadstatus = async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user id." });
  }

  try {
    const existingUser = await users.findById(userId);

    if (!existingUser) {
      return res.status(404).json({ message: "User unavailable." });
    }

    if (existingUser.isPremium) {
      return res.status(200).json({
        isPremium: true,
        downloadsToday: null,
        freeDailyLimit: FREE_DAILY_DOWNLOAD_LIMIT,
        remainingDownloads: null,
      });
    }

    const { startOfDay, endOfDay } = getTodayRange();
    const downloadsToday = await download.countDocuments({
      viewer: userId,
      downloadedon: { $gte: startOfDay, $lte: endOfDay },
    });

    return res.status(200).json({
      isPremium: false,
      downloadsToday,
      freeDailyLimit: FREE_DAILY_DOWNLOAD_LIMIT,
      remainingDownloads: Math.max(0, FREE_DAILY_DOWNLOAD_LIMIT - downloadsToday),
    });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const downloadfile = async (req, res) => {
  const { downloadId } = req.params;
  const userId = Array.isArray(req.query.userId)
    ? req.query.userId[0]
    : req.query.userId;

  if (!mongoose.Types.ObjectId.isValid(downloadId)) {
    return res.status(400).json({ message: "Invalid download id." });
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user id." });
  }

  try {
    const downloadRecord = await download
      .findById(downloadId)
      .populate({
        path: "videoid",
        model: "videofiles",
      })
      .exec();

    if (!downloadRecord || !downloadRecord.videoid) {
      return res.status(404).json({ message: "Download unavailable." });
    }

    if (String(downloadRecord.viewer) !== String(userId)) {
      return res.status(403).json({ message: "Download unavailable." });
    }

    const sourcePath = String(downloadRecord.videoid.filepath || "");
    const fileName = sourcePath.split(/[/\\]/).pop();

    if (!fileName) {
      return res.status(404).json({ message: "Video file unavailable." });
    }

    const absoluteFilePath = path.resolve(uploadsDirectory, fileName);

    if (!absoluteFilePath.startsWith(uploadsDirectory + path.sep)) {
      return res.status(404).json({ message: "Video file unavailable." });
    }

    if (!fs.existsSync(absoluteFilePath)) {
      return res.status(404).json({ message: "Video file unavailable." });
    }

    return res.download(
      absoluteFilePath,
      String(downloadRecord.videoid.filename || downloadRecord.videoid.videotitle)
    );
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
