import express from "express";
import { tokenAuthorizer } from "../middlewares/tokenAuthorizer.middleware.js";
import {
  createComment,
  createPost,
  deletePost,
  getAllPosts,
  getPost,
  getPostComments,
  getTrendingPosts,
  getUserPosts,
  likePost,
  savePost,
  updatePost,
} from "../controllers/post.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const postRouter = express.Router();

postRouter.post("/", getPost);

postRouter.post("/create", tokenAuthorizer, upload.single("file"), createPost);

postRouter.patch("/update", tokenAuthorizer, upload.single("file"), updatePost);

postRouter.post("/delete", tokenAuthorizer, deletePost);

postRouter.get("/all", tokenAuthorizer, getAllPosts);

postRouter.get("/trending", tokenAuthorizer, getTrendingPosts);

postRouter.post("/like", tokenAuthorizer, likePost);

postRouter.post("/comment", tokenAuthorizer, createComment);

postRouter.post("/save", tokenAuthorizer, savePost);

postRouter.post("/comments", getPostComments);

postRouter.post("/posts", tokenAuthorizer, getUserPosts);

export { postRouter };
