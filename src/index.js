import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import connectDatabase from "./db/index.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ApiErrorHandler } from "./utils/ApiError.js";
import { userRouter } from "./routes/user.route.js";
import { postRouter } from "./routes/post.route.js";
import { notificationRouter } from "./routes/notification.route.js";

/* SERVER INITIALIZATION */
const app = express();
dotenv.config({ path: "./.env" });
connectDatabase();

/* MIDDLEWARES */
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

/* ROUTES */
app.use("/api/user", userRouter);
app.use("/api/post", postRouter);
app.use("/api/notification", notificationRouter);

/* HANDLERS */
app.use(ApiErrorHandler);

/* LISTENERS */
mongoose.connection.once("open", () => {
  app.listen(process.env.PORT, () => {
    console.log(`Server listening on PORT: ${process.env.PORT}`);
  });
});

mongoose.connection.on("error", (error) => {
  console.log(error);
});
