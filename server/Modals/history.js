import mongoose from "mongoose";
const historyschema = mongoose.Schema(
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

historyschema.index({ viewer: 1, videoid: 1 });
historyschema.index({ viewer: 1, updatedAt: -1 });

export default mongoose.model("history", historyschema);
