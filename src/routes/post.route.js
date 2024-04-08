import express from "express";
import { tokenAuthorizer } from "../middlewares/tokenAuthorizer.middleware.js";
import {
  createPost,
  deletePost,
  getAllPosts,
  likePost,
  updatePost,
} from "../controllers/post.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const postRouter = express.Router();

postRouter.post("/create", tokenAuthorizer, upload.single("file"), createPost);

postRouter.patch("/update", tokenAuthorizer, upload.single("file"), updatePost);

postRouter.post("/delete", tokenAuthorizer, deletePost);

postRouter.get("/all", tokenAuthorizer, getAllPosts);

postRouter.post("/like", tokenAuthorizer, likePost);

export { postRouter };
