import { userModel } from "../models/user.model.js";
import { CustomError } from "../utils/ApiError.js";
import { ApiResponseHandler } from "../utils/ApiResponse.js";
import { requiredFieldsChecker } from "../utils/requiredFieldsChecker.js";

const sanitizeUser = (user) => {
  const sanitizedUser = user.toObject();
  delete sanitizedUser.password;
  delete sanitizedUser.refreshToken;

  return sanitizedUser;
};

const generateTokens = async (userId) => {
  try {
    const user = await userModel.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    const updatedUser = await user.save();
    if (!updatedUser) {
      throw new CustomError({
        statusCode: 500,
        message: "Could not save token to user",
      });
    }

    return { accessToken, refreshToken, updatedUser };
  } catch (error) {
    throw new CustomError({
      statusCode: 500,
      message: `Error occurred while generating tokens: ${error.message}`,
    });
  }
};

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

export const loginUser = async (req, res, next) => {
  try {
    /* Check required field */
    const { email, password } = req.body;
    requiredFieldsChecker(req, ["email", "password"]);

    /* Find user */
    const user = await userModel.findOne({
      email: email,
    });
    if (!user) {
      throw new CustomError({
        statusCode: 400,
        message: "User not found!",
      });
    }

    /* Match password */
    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
      throw new CustomError({
        statusCode: 400,
        message: "Wrong password!",
      });
    }

    /* Generate access and refresh tokens */
    const { accessToken, refreshToken, updatedUser } = await generateTokens(
      user._id
    );

    /* Set cookies */
    const cookieOptions = {
      httpOnly: true,
      secure: true,
    };
    res.cookie("accessToken", accessToken, cookieOptions);
    res.cookie("refreshToken", refreshToken, cookieOptions);

    /* Remove unrequired fields */
    const sanitizedUser = sanitizeUser(updatedUser);

    /* Send response */
    ApiResponseHandler({
      res: res,
      statusCode: 200,
      message: "User logged in successfully",
      data: {
        user: sanitizedUser,
        accessToken: accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logoutUser = async (req, res, next) => {
  try {
    const user = req.user;

    await userModel.findByIdAndUpdate(user._id, {
      $set: {
        refreshToken: null,
      },
    });

    const cookieOptions = {
      httpOnly: true,
      secure: true,
    };

    res.clearCookie("accessToken", cookieOptions);
    res.clearCookie("refreshToken", cookieOptions);

    ApiResponseHandler({
      res: res,
      statusCode: 200,
      message: "User logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};
