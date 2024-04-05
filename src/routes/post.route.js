import express from "express";
import { tokenAuthorizer } from "../middlewares/tokenAuthorizer.middleware.js";
import { createPost } from "../controllers/post.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const postRouter = express.Router();

postRouter.post("/create", tokenAuthorizer, upload.single("file"), createPost);

export { postRouter };
