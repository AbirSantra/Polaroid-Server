import { notificationModel } from "../models/notification.model.js";
import { ApiResponseHandler } from "../utils/ApiResponse.js";

export const getAllNotifications = async (req, res, next) => {
  try {
    const user = req.user;

    const notifications = await notificationModel
      .find({
        recipient: user._id,
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
