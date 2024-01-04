import express from "express";
import {
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
} from "../controllers/user.controller.js";
import { tokenAuthorizer } from "../middlewares/tokenAuthorizer.middleware.js";

const userRouter = express.Router();

userRouter.post("/register", registerUser);

userRouter.post("/login", loginUser);

userRouter.post("/logout", tokenAuthorizer, logoutUser);

userRouter.post("/refresh", refreshAccessToken);

export { userRouter };
