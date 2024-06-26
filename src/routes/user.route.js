import express from "express";
import {
  changePassword,
  deleteUser,
  followUser,
  getCurrentUser,
  getSearchUsers,
  getSuggestedUsers,
  getUserFollowings,
  getUserProfile,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  updateUser,
} from "../controllers/user.controller.js";
import { tokenAuthorizer } from "../middlewares/tokenAuthorizer.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const userRouter = express.Router();

userRouter.post("/register", registerUser);

userRouter.post("/login", loginUser);

userRouter.post("/logout", tokenAuthorizer, logoutUser);

userRouter.post("/refresh", refreshAccessToken);

userRouter.get("/current", tokenAuthorizer, getCurrentUser);

userRouter.patch("/update", tokenAuthorizer, upload.single("file"), updateUser);

userRouter.patch("/password", tokenAuthorizer, changePassword);

userRouter.delete("/delete", tokenAuthorizer, deleteUser);

userRouter.post("/profile", tokenAuthorizer, getUserProfile);

userRouter.post("/follow", tokenAuthorizer, followUser);

userRouter.get("/suggested", tokenAuthorizer, getSuggestedUsers);

userRouter.get("/following", tokenAuthorizer, getUserFollowings);

userRouter.post("/search", tokenAuthorizer, getSearchUsers);

export { userRouter };
