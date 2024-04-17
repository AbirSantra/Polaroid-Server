import express from "express";
import { getAllNotifications } from "../controllers/notification.controller.js";
import { tokenAuthorizer } from "../middlewares/tokenAuthorizer.middleware.js";

export const notificationRouter = express.Router();

notificationRouter.get("/all", tokenAuthorizer, getAllNotifications);
