import mongoose from "mongoose";

const saveSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    post: { type: mongoose.Schema.Types.ObjectId, ref: "post" },
  },
  {
    timestamps: true,
  }
);

export const saveModel = mongoose.model("save", saveSchema);
