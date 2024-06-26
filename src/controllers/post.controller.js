import mongoose from "mongoose";
import { commentModel } from "../models/comment.model.js";
import { likeModel } from "../models/like.model.js";
import { postModel } from "../models/post.model.js";
import { saveModel } from "../models/save.model.js";
import { CustomError } from "../utils/ApiError.js";
import { ApiResponseHandler } from "../utils/ApiResponse.js";
import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from "../utils/cloudinary.js";
import { requiredFieldsChecker } from "../utils/requiredFieldsChecker.js";
import { followModel } from "../models/follow.model.js";
import { notificationModel } from "../models/notification.model.js";

export const createPost = async (req, res, next) => {
  try {
    const user = req.user;

    requiredFieldsChecker(req, ["content"]);

    const { content } = req.body;
    const postImage = req.file;

    requiredFieldsChecker(req, ["content"]);

    const postObj = new postModel({
      content: content,
      user: user._id,
    });

    if (postImage) {
      const postImageLocalPath = postImage.path;
      const postImageUploadResult = await uploadToCloudinary({
        localFilePath: postImageLocalPath,
      });
      if (!postImageUploadResult.success) {
        throw new CustomError({
          status: 500,
          message: postImageUploadResult.message,
        });
      }

      const imageUrl = postImageUploadResult.data.url;
      const imageId = postImageUploadResult.data.public_id;
      postObj.imageUrl = imageUrl;
      postObj.imageId = imageId;
    }

    const post = await postObj.save();
    if (!post) {
      throw new CustomError({
        status: 500,
        message: "Error occurred while saving post!",
      });
    }

    const newPost = await postModel.findById(post._id);
    if (!newPost) {
      throw new CustomError({
        status: 500,
        message: `Error occurred while trying to fetch new post!`,
      });
    }

    ApiResponseHandler({
      res: res,
      status: 200,
      message: "Post created successfully!",
      data: newPost,
    });
  } catch (error) {
    next(error);
  }
};

export const updatePost = async (req, res, next) => {
  try {
    const user = req.user;

    requiredFieldsChecker(req, ["_id"]);

    const { _id, content } = req.body;
    const postImage = req.file;

    const existingPost = await postModel.findById(_id);
    if (!existingPost) {
      throw new CustomError({
        status: 400,
        message: "Post not found!",
      });
    }

    existingPost.content = content;

    if (postImage) {
      const postImageLocalPath = postImage.path;
      const postImageUploadResult = await uploadToCloudinary({
        localFilePath: postImageLocalPath,
      });
      if (!postImageUploadResult.success) {
        throw new CustomError({
          status: 500,
          message: "Post Image",
        });
      }

      const oldPostImageDeleteResult = await deleteFromCloudinary({
        imageId: existingPost.imageId,
      });

      const postImageUrl = postImageUploadResult.data.url;
      const postImageId = postImageUploadResult.data.public_id;
      existingPost.imageUrl = postImageUrl;
      existingPost.imageId = postImageId;
    }

    const updatedPost = await existingPost.save();
    if (!updatedPost) {
      throw new CustomError({
        status: 500,
        message: "Could not update post",
      });
    }

    ApiResponseHandler({
      res: res,
      status: 200,
      message: `Post updated successfully!`,
      data: updatedPost,
    });
  } catch (error) {
    next(error);
  }
};

export const deletePost = async (req, res, next) => {
  try {
    const user = req.user;

    requiredFieldsChecker(req, ["_id"]);

    const { _id } = req.body;

    const deleteQuery = { _id: _id, user: user._id };
    const deletedPost = await postModel.findOneAndDelete(deleteQuery);

    if (!deletedPost) {
      throw new CustomError({
        status: 500,
        message: `Could not delete this post!`,
      });
    }

    if (deletedPost.imageId) {
      const oldPostImageDeleteResult = await deleteFromCloudinary({
        imageId: deletedPost.imageId,
      });
      if (!oldPostImageDeleteResult.success) {
        console.log("Could not delete post image from cloudinary!");
      }
    }

    ApiResponseHandler({
      res: res,
      status: 200,
      message: `Successfully deleted post!`,
      data: deletedPost,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllPosts = async (req, res, next) => {
  try {
    const user = req.user;

    const allPosts = await postModel
      .find({}, null, {
        sort: { createdAt: -1 },
      })
      .populate({
        path: "user",
        select: "_id username avatar fullName email",
      })
      .exec();

    ApiResponseHandler({
      res: res,
      status: 200,
      message: `Successfully retrived all posts!`,
      data: allPosts,
    });
  } catch (error) {
    next(error);
  }
};

const calculateEngagementScore = (post) => {
  const likesWeightage = 0.7;
  const commentsWeightage = 0.3;
  const totalLikes = post.likesCount + 1;
  const totalComments = post.commentsCount + 1;

  return totalLikes * likesWeightage + totalComments * commentsWeightage;
};

const applyTimeDecay = ({ engagementScore, hoursSincePost }) => {
  const timeFactor = 3;
  const decayedEngagementScore = engagementScore / Math.log(hoursSincePost + 1);
  return decayedEngagementScore * timeFactor;
};

export const getTrendingPosts = async (req, res, next) => {
  try {
    const allTrendingPosts = await postModel.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "post",
          as: "likes",
        },
      },
      {
        $lookup: {
          from: "comments",
          localField: "_id",
          foreignField: "post",
          as: "comments",
        },
      },
      {
        $lookup: {
          from: "saves",
          localField: "_id",
          foreignField: "post",
          as: "saves",
        },
      },
      {
        $addFields: {
          likesCount: { $size: "$likes" },
          commentsCount: { $size: "$comments" },
          user: { $arrayElemAt: ["$user", 0] },
        },
      },
      {
        $project: {
          "user.password": 0,
          "user.refreshToken": 0,
        },
      },
    ]);

    const trendingPosts = allTrendingPosts.map((post) => {
      const engagementScore = calculateEngagementScore(post);
      const hoursSincePost =
        (Date.now() - post.createdAt.getTime()) / (1000 * 3600);
      const adjustedEngagementScore = applyTimeDecay({
        engagementScore: engagementScore,
        hoursSincePost: hoursSincePost,
      });

      return {
        ...post,
        score: adjustedEngagementScore,
      };
    });

    trendingPosts.sort((a, b) => b.score - a.score);

    ApiResponseHandler({
      res: res,
      status: 200,
      message: `Successfully retrieved trending posts`,
      data: trendingPosts,
    });
  } catch (error) {
    next(error);
  }
};

export const getPost = async (req, res, next) => {
  try {
    requiredFieldsChecker(req, ["postId"]);

    const { postId } = req.body;

    const postResult = await postModel.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(postId) },
      },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "post",
          as: "likes",
        },
      },
      {
        $lookup: {
          from: "comments",
          localField: "_id",
          foreignField: "post",
          as: "comments",
        },
      },
      {
        $lookup: {
          from: "saves",
          localField: "_id",
          foreignField: "post",
          as: "saves",
        },
      },
      {
        $addFields: {
          likesCount: { $size: "$likes" },
          commentsCount: { $size: "$comments" },
          user: { $arrayElemAt: ["$user", 0] },
        },
      },
      {
        $project: {
          "user.password": 0,
          "user.refreshToken": 0,
        },
      },
    ]);

    if (postResult.length === 0) {
      throw new CustomError({
        status: 500,
        message: `Post not found!`,
      });
    }

    ApiResponseHandler({
      res: res,
      status: 200,
      message: `Successfully retrieved post`,
      data: postResult[0],
    });
  } catch (error) {
    next(error);
  }
};

export const likePost = async (req, res, next) => {
  try {
    const user = req.user;

    requiredFieldsChecker(req, ["postId"]);

    const { postId } = req.body;

    /* Check if the post exists */
    const existingPost = await postModel.findById(postId);
    if (!existingPost) {
      throw new CustomError({
        status: 500,
        message: `Failed to like post! Reason: Post does not exist!`,
      });
    }

    /* Check if post is already liked */
    const existingLike = await likeModel.findOne({
      post: existingPost._id,
      user: user._id,
    });
    if (existingLike) {
      const unlike = await likeModel.findByIdAndDelete(existingLike._id);
      if (!unlike) {
        throw new CustomError({
          status: 500,
          message: `Failed to unlike post! Reason: Could not delete like`,
        });
      }

      ApiResponseHandler({
        res: res,
        status: 200,
        message: `Successfully unliked post!`,
        data: unlike,
      });
    } else {
      /* Create like document */
      const likeDoc = new likeModel({
        post: existingPost._id,
        user: user._id,
      });

      const newLike = await likeDoc.save();
      if (!newLike) {
        throw new CustomError({
          status: 500,
          message: `Failed to like post! Reason: Could not save like`,
        });
      }

      /* Create Like Notification */
      const newNotif = new notificationModel({
        type: "LIKE",
        user: user._id,
        recipient: existingPost.user,
        post: existingPost._id,
      });

      await newNotif.save();

      ApiResponseHandler({
        res: res,
        status: 200,
        message: `Successfully liked post!`,
        data: newLike,
      });
    }
  } catch (error) {
    next(error);
  }
};

export const savePost = async (req, res, next) => {
  try {
    requiredFieldsChecker(req, ["postId"]);

    const user = req.user;
    const { postId } = req.body;

    /* Check if the post exists */
    const existingPost = await postModel.findById(postId);
    if (!existingPost) {
      throw new CustomError({
        status: 500,
        message: `Failed to like post! Reason: Post does not exist!`,
      });
    }

    const existingSave = await saveModel.findOne({
      post: existingPost._id,
      user: user._id,
    });
    if (existingSave) {
      /* Post is already saved by user. Unsave post */
      const unsave = await saveModel.findByIdAndDelete(existingSave._id);
      if (!unsave) {
        throw new CustomError({
          status: 500,
          message: `Failed to unsave post. Reason: Could not delete saved post`,
        });
      }

      ApiResponseHandler({
        res: res,
        status: 200,
        message: `Successfully unsaved post!`,
        data: unsave,
      });
    } else {
      /* Post is not already saved by user. Save post */
      const saveDoc = new saveModel({
        user: user._id,
        post: existingPost._id,
      });

      const newSave = await saveDoc.save();
      if (!newSave) {
        throw new CustomError({
          status: 500,
          message: `Failed to save post! Reason: Could not save post!`,
        });
      }

      ApiResponseHandler({
        res: res,
        status: 200,
        message: `Successfully saved post!`,
        data: newSave,
      });
    }
  } catch (error) {
    next(error);
  }
};

export const createComment = async (req, res, next) => {
  try {
    requiredFieldsChecker(req, ["postId", "content"]);

    const user = req.user;
    const { postId, content } = req.body;

    /* Check if the post exists */
    const existingPost = await postModel.findById(postId);
    if (!existingPost) {
      throw new CustomError({
        status: 500,
        message: `Failed to comment on post! Reason: Post does not exist!`,
      });
    }

    /* Create new comment document */
    const commentDoc = new commentModel({
      content: content,
      post: existingPost._id,
      user: user._id,
    });

    const newComment = await commentDoc.save();
    if (!newComment) {
      throw new CustomError({
        status: 500,
        message: `Failed to comment on post. Reason: Comment could not be saved`,
      });
    }

    /* Create Comment Notification */
    const newNotif = new notificationModel({
      type: "COMMENT",
      user: user._id,
      recipient: existingPost.user,
      post: existingPost._id,
    });

    await newNotif.save();

    ApiResponseHandler({
      res: res,
      status: 200,
      message: `Successfully commented on post!`,
      data: newComment,
    });
  } catch (error) {
    next(error);
  }
};

export const getPostComments = async (req, res, next) => {
  try {
    requiredFieldsChecker(req, ["postId"]);

    const { postId } = req.body;

    const comments = await commentModel
      .find({ post: postId }, null, {
        sort: { createdAt: -1 },
      })
      .populate({
        path: "user",
        select: "_id username avatar fullName email",
      })
      .exec();

    ApiResponseHandler({
      res: res,
      status: 200,
      message: `Successfully retrieved all comments`,
      data: comments,
    });
  } catch (error) {
    next(error);
  }
};

export const getUserPosts = async (req, res, next) => {
  try {
    requiredFieldsChecker(req, ["userId"]);

    const { userId } = req.body;

    const allUserPosts = await postModel.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId) } },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "post",
          as: "likes",
        },
      },
      {
        $lookup: {
          from: "comments",
          localField: "_id",
          foreignField: "post",
          as: "comments",
        },
      },
      {
        $lookup: {
          from: "saves",
          localField: "_id",
          foreignField: "post",
          as: "saves",
        },
      },
      {
        $addFields: {
          likesCount: { $size: "$likes" },
          commentsCount: { $size: "$comments" },
          user: { $arrayElemAt: ["$user", 0] },
        },
      },
      {
        $project: {
          "user.password": 0,
          "user.refreshToken": 0,
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
    ]);

    ApiResponseHandler({
      res: res,
      status: 200,
      message: `Successfully retrieved users posts`,
      data: allUserPosts,
    });
  } catch (error) {
    next(error);
  }
};

export const getUserSaves = async (req, res, next) => {
  try {
    requiredFieldsChecker(req, ["userId"]);

    const { userId } = req.body;

    const saves = await saveModel.find({
      user: userId,
    });

    const postIds = saves.map((save) => save.post);

    const allUserSaves = await postModel.aggregate([
      { $match: { _id: { $in: postIds } } },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "post",
          as: "likes",
        },
      },
      {
        $lookup: {
          from: "comments",
          localField: "_id",
          foreignField: "post",
          as: "comments",
        },
      },
      {
        $lookup: {
          from: "saves",
          localField: "_id",
          foreignField: "post",
          as: "saves",
        },
      },
      {
        $addFields: {
          likesCount: { $size: "$likes" },
          commentsCount: { $size: "$comments" },
          user: { $arrayElemAt: ["$user", 0] },
        },
      },
      {
        $project: {
          "user.password": 0,
          "user.refreshToken": 0,
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
    ]);

    ApiResponseHandler({
      res: res,
      status: 200,
      message: `Successfully retrieved user saves`,
      data: allUserSaves,
    });
  } catch (error) {
    next(error);
  }
};

export const getFollowingPosts = async (req, res, next) => {
  try {
    const user = req.user;

    const follows = await followModel.find({
      user: user._id,
    });

    const userIds = follows.map((follow) => follow.following);

    const allFollowingPosts = await postModel.aggregate([
      { $match: { user: { $in: userIds } } },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "post",
          as: "likes",
        },
      },
      {
        $lookup: {
          from: "comments",
          localField: "_id",
          foreignField: "post",
          as: "comments",
        },
      },
      {
        $lookup: {
          from: "saves",
          localField: "_id",
          foreignField: "post",
          as: "saves",
        },
      },
      {
        $addFields: {
          likesCount: { $size: "$likes" },
          commentsCount: { $size: "$comments" },
          user: { $arrayElemAt: ["$user", 0] },
        },
      },
      {
        $project: {
          "user.password": 0,
          "user.refreshToken": 0,
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
    ]);

    ApiResponseHandler({
      res: res,
      status: 200,
      message: `Successfully retrieved following posts`,
      data: allFollowingPosts,
    });
  } catch (error) {
    next(error);
  }
};
