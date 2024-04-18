import { ApiResponseHandler } from "../utils/ApiResponse.js";

export const healthCheck = async (req, res, next) => {
  try {
    ApiResponseHandler({
      res: res,
      status: 200,
      message: `Server is up and running`,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};
