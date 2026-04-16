import mongoose from "mongoose";

const downloadschema = mongoose.Schema(
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
    downloadedon: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

downloadschema.index({ viewer: 1, videoid: 1 });
downloadschema.index({ viewer: 1, downloadedon: -1 });

export default mongoose.model("download", downloadschema);
