import mongoose from "mongoose";
const likeschema = mongoose.Schema(
  {
    viewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    videoid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "videofiles",
      required: true,
    },
    likedon: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

likeschema.index({ viewer: 1, videoid: 1 });
likeschema.index({ viewer: 1, updatedAt: -1 });

export default mongoose.model("like", likeschema);
