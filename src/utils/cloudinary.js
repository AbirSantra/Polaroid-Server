import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { Result } from "./result.js";
import { CustomError } from "./ApiError.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_CLOUD_API_KEY,
  api_secret: process.env.CLOUDINARY_CLOUD_API_SECRET,
});

export const uploadToCloudinary = async ({ localFilePath }) => {
  try {
    if (!localFilePath) {
      throw new CustomError({
        status: 500,
        message: "Local file path does not exist!",
      });
    }

    const uploadResult = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    fs.unlinkSync(localFilePath);
    return new Result({
      status: 200,
      success: true,
      message: `File uploaded successfully. URL: ${uploadResult.url}`,
      data: uploadResult,
    });
  } catch (error) {
    fs.unlinkSync(localFilePath);
    return new Result({
      status: error.status,
      message: error.message,
    });
  }
};
