import { notificationModel } from "../models/notification.model.js";
import { ApiResponseHandler } from "../utils/ApiResponse.js";

export const getAllNotifications = async (req, res, next) => {
  try {
    const user = req.user;

    const notifications = await notificationModel
      .find({
        recipient: user._id,
      })
      .populate({
        path: "user",
        select: "-password -refreshToken",
      })
      .sort({ createdAt: -1 })
      .limit(10)
      .exec();

    ApiResponseHandler({
      res: res,
      status: 200,
      message: `Successfully retrieved all notifications of users`,
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};

export const markNotificationsAsSeen = async (req, res, next) => {
  try {
    const user = req.user;

    const updatedNotifications = await notificationModel
      .updateMany(
        { recipient: user._id, seen: false },
        { $set: { seen: true } }
      )
      .exec();

    ApiResponseHandler({
      res: res,
      status: 200,
      message: `Successfully marked notifications as seen`,
      data: updatedNotifications,
    });
  } catch (error) {
    next(error);
  }
};
