import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import connectDatabase from "./db/index.js";

/* SERVER INITIALIZATION */
const app = express();
dotenv.config({ path: "./.env" });
connectDatabase();

/* MIDDLEWARES */

/* ROUTES */

/* LISTENERS */
mongoose.connection.once("open", () => {
  app.listen(process.env.PORT, () => {
    console.log(`Server listening on PORT: ${process.env.PORT}`);
  });
});

mongoose.connection.on("error", (error) => {
  console.log(error);
});
