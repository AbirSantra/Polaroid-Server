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
        status: 401,
        message: "Access token not found!",
      });
    }

    await jwt.verify(
      token,
      process.env.ACCESS_SECRET,
      async (error, decoded) => {
        if (error) {
          new CustomError({
            status: 403,
            message: "Access token expired!",
          });
        }

        const user = await userModel
          .findById(decoded?.userId)
          .select("-password -refreshToken");

        if (!user) {
          new CustomError({
            status: 401,
            message: "Access token invalid!",
          });
        }

        req.user = user;
        next();
      }
    );
  } catch (error) {
    next(error);
  }
};
