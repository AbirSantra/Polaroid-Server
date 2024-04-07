import { postModel } from "../models/post.model.js";
import { CustomError } from "../utils/ApiError.js";
import { ApiResponseHandler } from "../utils/ApiResponse.js";
import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from "../utils/cloudinary.js";
import { requiredFieldsChecker } from "../utils/requiredFieldsChecker.js";

export const createPost = async (req, res, next) => {
  try {
    const user = req.user;

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
