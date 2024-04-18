import express from "express";
import { healthCheck } from "../controllers/public.controller.js";

export const publicRouter = express.Router();

publicRouter.get("/health", healthCheck);
