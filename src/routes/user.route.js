import express from "express";
import { registerUser } from "../controllers/user.controller.js";

const userRouter = express.Router();

userRouter.post("/register", registerUser);

export { userRouter };
