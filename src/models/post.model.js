import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    imageUrl: { type: String },
    imageId: { type: String },
    content: { type: String },
  },
  {
    timestamps: true,
  }
);

export const postModel = mongoose.model("post", postSchema);
