import video from "../Modals/video.js";

export const uploadvideo = async (req, res) => {
  const videoTitle = String(req.body.videotitle || "").trim();
  const videoChannel = String(req.body.videochanel || "").trim();
  const uploader = String(req.body.uploader || "").trim();

  if (req.file === undefined) {
    return res
      .status(404)
      .json({ message: "plz upload a mp4 video file only" });
  } else if (!videoTitle || !videoChannel || !uploader) {
    return res.status(400).json({ message: "Video title and channel are required." });
  } else {
    try {
      const file = new video({
        videotitle: videoTitle,
        filename: req.file.originalname,
        filepath: req.file.path,
        filetype: req.file.mimetype,
        filesize: req.file.size,
        videochanel: videoChannel,
        uploader,
      });
      await file.save();
      return res.status(201).json({ message: "file uploaded successfully", video: file });
    } catch (error) {
      console.error(" error:", error);
      return res.status(500).json({ message: "Something went wrong" });
    }
  }
};
export const getallvideo = async (req, res) => {
  try {
    const files = await video.find().sort({ createdAt: -1 });
    return res.status(200).send(files);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
