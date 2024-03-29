import { Result } from "./result.js";

class ApiResponse {
  constructor({ status, data, message = "Request Successful!" }) {
    this.status = status;
    this.data = data;
    this.message = message;
    this.success = status < 400;
  }
}

const ApiResponseHandler = ({ res, status = 200, message, data }) => {
  const apiResponse = new ApiResponse({
    status: status,
    data: data,
    message: message,
  });
  res.status(apiResponse.status).json(
    new Result({
      status: apiResponse.status,
      success: apiResponse.success,
      error: null,
      message: apiResponse.message,
      data: apiResponse.data,
    })
  );
};

export { ApiResponse, ApiResponseHandler };
