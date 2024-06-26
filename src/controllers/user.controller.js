import { userModel } from "../models/user.model.js";
import { CustomError } from "../utils/ApiError.js";
import { ApiResponseHandler } from "../utils/ApiResponse.js";
import { requiredFieldsChecker } from "../utils/requiredFieldsChecker.js";
import jwt from "jsonwebtoken";
import { Result } from "../utils/result.js";
import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from "../utils/cloudinary.js";
import mongoose from "mongoose";
import { followModel } from "../models/follow.model.js";
import { notificationModel } from "../models/notification.model.js";

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
        status: 500,
        message: "Could not save token to user",
      });
    }

    return new Result({
      status: 200,
      success: true,
      message: `Successfully generated access and refresh tokens for user: ${user._id}`,
      data: { accessToken, refreshToken, updatedUser },
    });
  } catch (error) {
    return new Result({
      status: 500,
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
        status: 400,
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
        status: 500,
        message: "Error occurred while creating new user",
      });
    }

    /* Get the user and remove fields */
    const newUser = await userModel
      .findById(user._id)
      .select("-password -refreshToken");
    if (!newUser) {
      throw new CustomError({
        status: 500,
        message: "Error occurred while trying to fetch new user",
      });
    }

    ApiResponseHandler({
      res: res,
      status: 200,
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
        status: 400,
        message: "User not found!",
      });
    }

    /* Match password */
    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
      throw new CustomError({
        status: 400,
        message: "Wrong password!",
      });
    }

    /* Generate access and refresh tokens */
    const { data: tokenResult } = await generateTokens(user._id);
    const accessToken = tokenResult.accessToken;
    const refreshToken = tokenResult.refreshToken;
    const updatedUser = tokenResult.updatedUser;

    /* Set cookies */
    const cookieOptions = {
      httpOnly: true,
      secure: true,
      maxAge: 8 * 24 * 60 * 60 * 1000,
      sameSite: "none",
    };
    res.cookie("accessToken", accessToken, cookieOptions);
    res.cookie("refreshToken", refreshToken, cookieOptions);

    /* Remove unrequired fields */
    const sanitizedUser = sanitizeUser(updatedUser);

    /* Send response */
    ApiResponseHandler({
      res: res,
      status: 200,
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
      sameSite: "none",
    };

    res.clearCookie("accessToken", cookieOptions);
    res.clearCookie("refreshToken", cookieOptions);

    ApiResponseHandler({
      res: res,
      status: 200,
      message: "User logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const refreshAccessToken = async (req, res, next) => {
  try {
    const incomingRefreshToken =
      req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
      throw new CustomError({
        status: 401,
        message: "Refresh token not found!",
      });
    }

    jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_SECRET,
      async (error, decodedToken) => {
        if (error) {
          return next(
            new CustomError({
              status: 401,
              message: "Refresh token expired!",
            })
          );
        } else {
          const user = await userModel.findById(decodedToken.userId);

          if (!user) {
            return next(
              new CustomError({
                status: 401,
                message: "Refresh Token invalid",
              })
            );
          }

          if (incomingRefreshToken !== user?.refreshToken) {
            return next(
              new CustomError({
                status: 401,
                message: "Refresh token invalid!",
              })
            );
          }

          const options = {
            httpOnly: true,
            secure: true,
          };

          const { data: tokenResult } = await generateTokens(user._id);
          const accessToken = tokenResult.accessToken;
          const refreshToken = tokenResult.refreshToken;
          const updatedUser = tokenResult.updatedUser;

          res.cookie("accessToken", accessToken, options);
          res.cookie("refreshToken", refreshToken, options);

          const sanitizedUser = sanitizeUser(updatedUser);

          ApiResponseHandler({
            res: res,
            status: 200,
            message: "Access token refreshed successfully",
            data: {
              user: sanitizedUser,
              accessToken: accessToken,
            },
          });
        }
      }
    );
  } catch (error) {
    next(error);
  }
};

export const getCurrentUser = async (req, res, next) => {
  try {
    /* Get the current user from the req.user set by auth middleware */
    const user = req.user;

    /* Send response */
    ApiResponseHandler({
      res: res,
      status: 200,
      message: "User logged in successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const user = req.user;

    const { fullName, username, email, bio } = req.body;
    const avatar = req.file;

    /* Check for username */
    if (username) {
      const usernameCheckQuery = { _id: { $ne: user._id }, username: username };
      const existingUserWithUsername = await userModel
        .findOne(usernameCheckQuery)
        .lean();
      if (existingUserWithUsername) {
        throw new CustomError({
          status: 400,
          message: "Username already taken",
        });
      }

      user.username = username;
    }

    /* Check for email */
    if (email) {
      const emailCheckQuery = { _id: { $ne: user._id }, email: email };
      const existingUserWithEmail = await userModel
        .findOne(emailCheckQuery)
        .lean();
      if (existingUserWithEmail) {
        throw new CustomError({
          status: 400,
          message: "Email is already in use",
        });
      }
      user.email = email;
    }

    /* Check for avatar */
    if (avatar) {
      const avatarLocalPath = avatar.path;
      const avatarUploadResult = await uploadToCloudinary({
        localFilePath: avatarLocalPath,
      });
      if (!avatarUploadResult.success) {
        throw new CustomError({
          status: 500,
          message: avatarUploadResult.message,
        });
      }

      const oldAvatarDeleteResult = await deleteFromCloudinary({
        imageId: user.avatarId,
      });

      const avatarUrl = avatarUploadResult.data.url;
      const avatarId = avatarUploadResult.data.public_id;
      user.avatar = avatarUrl;
      user.avatarId = avatarId;
    }

    if (fullName) {
      user.fullName = fullName;
    }

    if (bio) {
      user.bio = bio;
    }

    const updatedUser = await user.save();
    if (!updatedUser) {
      throw new CustomError({
        status: 500,
        message: "Could not update user details",
      });
    }

    const sanitizedUser = sanitizeUser(updatedUser);

    ApiResponseHandler({
      res: res,
      status: 200,
      message: "User updated successfully",
      data: sanitizedUser,
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const user = req.user;
    const { currentPassword, newPassword } = req.body;
    requiredFieldsChecker(req, ["currentPassword", "newPassword"]);

    const existingUser = await userModel.findById(user._id);

    const isPasswordCorrect =
      await existingUser.isPasswordCorrect(currentPassword);
    if (!isPasswordCorrect) {
      throw new CustomError({
        status: 400,
        message: "Current password is incorrect!",
      });
    }

    existingUser.password = newPassword;

    await existingUser.save();

    ApiResponseHandler({
      res: res,
      status: 200,
      message: `Successfully updated password!`,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const user = req.user;

    const deletionQuery = { _id: user._id };
    const deletedUser = await userModel.findOneAndDelete(deletionQuery);
    if (!deletedUser) {
      throw new CustomError({
        status: 500,
        message: `Could not delete user: ${deletedUser}`,
      });
    }

    ApiResponseHandler({
      res: res,
      status: 200,
      message: `Successfully deleted user: ${deleteUser.username}`,
      data: deletedUser,
    });
  } catch (error) {
    next(error);
  }
};

export const getUserProfile = async (req, res, next) => {
  try {
    requiredFieldsChecker(req, ["userId"]);

    const { userId } = req.body;

    const userProfile = await userModel.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(userId) },
      },
      {
        $lookup: {
          from: "follows",
          localField: "_id",
          foreignField: "following",
          as: "followers",
        },
      },
      {
        $lookup: {
          from: "follows",
          localField: "_id",
          foreignField: "user",
          as: "followings",
        },
      },
      {
        $addFields: {
          followersCount: { $size: "$followers" },
          followingsCount: { $size: "$followings" },
        },
      },
      {
        $project: {
          password: 0,
          refreshToken: 0,
        },
      },
    ]);

    if (userProfile.length === 0) {
      throw new CustomError({
        status: 500,
        message: `User not found!`,
      });
    }

    ApiResponseHandler({
      res: res,
      status: 200,
      message: `Successfully retrieved user profile`,
      data: userProfile[0],
    });
  } catch (error) {
    next(error);
  }
};

export const followUser = async (req, res, next) => {
  try {
    requiredFieldsChecker(req, ["userId"]);

    const user = req.user;
    const { userId } = req.body;

    /* Check if the user exists */
    const existingUser = await userModel.findById(userId);
    if (!existingUser) {
      throw new CustomError({
        status: 500,
        message: `Failed to follow user! Reason: User does not exist!`,
      });
    }

    if (existingUser._id.toString() === user._id.toString()) {
      throw new CustomError({
        status: 500,
        message: `Failed to follow user! Reason: User cannot follow themselves`,
      });
    }

    const existingFollow = await followModel.findOne({
      following: existingUser._id,
      user: user._id,
    });
    if (existingFollow) {
      /* User is already followed by current user. Unfollow user */
      const unfollow = await followModel.findByIdAndDelete(existingFollow._id);
      if (!unfollow) {
        throw new CustomError({
          status: 500,
          message: `Failed to unfollow user. Reason: Could not delete follow`,
        });
      }

      ApiResponseHandler({
        res: res,
        status: 200,
        message: `Successfully unfollowed user!`,
        data: unfollow,
      });
    } else {
      /* User is not already followed by current user. Follow user */
      const followDoc = new followModel({
        user: user._id,
        following: existingUser._id,
      });

      const newFollow = await followDoc.save();
      if (!newFollow) {
        throw new CustomError({
          status: 500,
          message: `Failed to follow user! Reason: Could not follow user!`,
        });
      }

      /* Create Follow Notification */
      const newNotif = new notificationModel({
        type: "FOLLOW",
        user: user._id,
        recipient: existingUser._id,
      });

      await newNotif.save();

      ApiResponseHandler({
        res: res,
        status: 200,
        message: `Successfully followed user!`,
        data: newFollow,
      });
    }
  } catch (error) {
    next(error);
  }
};

// Function to shuffle an array (Fisher-Yates algorithm)
const shuffle = async (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

export const getSuggestedUsers = async (req, res, next) => {
  try {
    const user = req.user;

    const follows = await followModel.find({
      user: user._id,
    });

    const followedUserIds = follows.map((follow) => follow.following);

    const users = await userModel
      .find({ _id: { $ne: user._id, $nin: followedUserIds } })
      .select("-password -refreshToken")
      .exec();

    const shuffledUsers = await shuffle(users);

    const suggestedUsers = shuffledUsers.slice(0, 6);

    ApiResponseHandler({
      res: res,
      status: 200,
      message: `Successfully retrieved all suggested users`,
      data: suggestedUsers,
    });
  } catch (error) {
    next(error);
  }
};

export const getUserFollowings = async (req, res, next) => {
  try {
    const user = req.user;

    const follows = await followModel
      .find({
        user: user._id,
      })
      .lean();

    const followedUserIds = follows.map((follow) => follow.following);

    const followedUsers = await userModel
      .find({
        _id: { $ne: user._id, $in: followedUserIds },
      })
      .select("-password -refreshToken")
      .limit(10)
      .lean()
      .exec();

    ApiResponseHandler({
      res: res,
      status: 200,
      message: `Successfully retrieved users`,
      data: followedUsers,
    });
  } catch (error) {
    next(error);
  }
};

export const getSearchUsers = async (req, res, next) => {
  try {
    requiredFieldsChecker(req, ["searchTerm"]);

    const user = req.user;

    const searchTerm = req.body.searchTerm;

    const users = await userModel
      .find({
        _id: { $ne: user._id },
        $or: [
          { username: { $regex: searchTerm, $options: "i" } }, // Case-insensitive search on username
          { fullName: { $regex: searchTerm, $options: "i" } }, // Case-insensitive search on full name
        ],
      })
      .exec();

    ApiResponseHandler({
      res: res,
      status: 200,
      message: `Successfully retrieved matching users`,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};
