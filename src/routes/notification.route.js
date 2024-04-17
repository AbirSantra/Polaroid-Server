import express from "express";
import {
  getAllNotifications,
  markNotificationsAsSeen,
} from "../controllers/notification.controller.js";
import { tokenAuthorizer } from "../middlewares/tokenAuthorizer.middleware.js";

export const notificationRouter = express.Router();

notificationRouter.get("/all", tokenAuthorizer, getAllNotifications);

notificationRouter.patch(
  "/mark-as-seen",
  tokenAuthorizer,
  markNotificationsAsSeen
);
