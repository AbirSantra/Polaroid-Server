import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    post: { type: mongoose.Schema.Types.ObjectId, ref: "post", required: true },
    content: { type: String },
  },
  {
    timestamps: true,
  }
);

export const commentModel = mongoose.model("comment", commentSchema);
