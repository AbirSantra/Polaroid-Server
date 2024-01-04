import { userModel } from "../models/user.model.js";
import { CustomError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";

export const tokenAuthorizer = async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "") ||
      req.header("authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new CustomError({
        statusCode: 401,
        message: "Access token not found!",
      });
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_SECRET);

    const user = await userModel
      .findById(decodedToken?.userId)
      .select("-password -refreshToken");

    if (!user) {
      throw new CustomError({
        statusCode: 403,
        message: "Access token invalid or expired!",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
