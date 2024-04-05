import { postModel } from "../models/post.model.js";
import { CustomError } from "../utils/ApiError.js";
import { ApiResponseHandler } from "../utils/ApiResponse.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
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
