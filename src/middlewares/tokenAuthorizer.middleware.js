import { userModel } from "../models/user.model";
import { CustomError } from "../utils/ApiError";
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

    jwt.verify(token, process.env.ACCESS_SECRET, async (error, decoded) => {
      if (error) {
        throw new CustomError({
          statusCode: 403,
          message: "Access token expired!",
        });
      }

      const user = await userModel
        .findById(decoded.userId)
        .select("-password -refreshToken");

      if (!user) {
        throw new CustomError({
          statusCode: 401,
          message: "Access token invalid!",
        });
      }

      req.user = user;
      next();
    });
  } catch (error) {
    next(error);
  }
};
