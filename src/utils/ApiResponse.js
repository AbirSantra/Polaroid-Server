class ApiResponse {
  constructor(statusCode, data, message = "Request Successful!") {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }
}

const ApiResponseHandler = ({ res, statusCode = 200, message, data }) => {
  const apiResponse = new ApiResponse(statusCode, data, message);
  res.status(apiResponse.statusCode).json({
    success: apiResponse.success,
    statusCode: apiResponse.statusCode,
    message: apiResponse.message,
    data: apiResponse.data,
    error: null,
  });
};

export { ApiResponse, ApiResponseHandler };
