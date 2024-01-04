import { userModel } from "../models/user.model.js";
import { CustomError } from "../utils/ApiError.js";
import { ApiResponseHandler } from "../utils/ApiResponse.js";
import { requiredFieldsChecker } from "../utils/requiredFieldsChecker.js";

export const registerUser = async (req, res, next) => {
  try {
    const { username, email, password, fullName } = req.body;
    requiredFieldsChecker(req, ["username", "email", "password", "fullName"]);

    /* Check for user with same username or email */
    const existingUser = await userModel.findOne({
      $or: [{ username: username }, { email: email }],
    });
    if (existingUser) {
      throw new CustomError({
        statusCode: 400,
        message: "User with same email or username already exists!",
      });
    }

    /* Create User */
    const userObj = new userModel({
      username: username,
      email: email,
      password: password,
      fullName: fullName,
    });
    const user = await userObj.save();
    if (!user) {
      throw new CustomError({
        statusCode: 500,
        message: "Error occurred while creating new user",
      });
    }

    /* Get the user and remove fields */
    const newUser = await userModel
      .findById(user._id)
      .select("-password -refreshToken");
    if (!newUser) {
      throw new CustomError({
        statusCode: 500,
        message: "Error occurred while trying to fetch new user",
      });
    }

    ApiResponseHandler({
      res: res,
      statusCode: 200,
      message: "User created successfully",
      data: newUser,
    });
  } catch (error) {
    next(error);
  }
};
