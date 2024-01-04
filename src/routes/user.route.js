import express from "express";
import {
  loginUser,
  logoutUser,
  registerUser,
} from "../controllers/user.controller.js";
import { tokenAuthorizer } from "../middlewares/tokenAuthorizer.middleware.js";

const userRouter = express.Router();

userRouter.post("/register", registerUser);

userRouter.post("/login", loginUser);

userRouter.post("/logout", tokenAuthorizer, logoutUser);

export { userRouter };
