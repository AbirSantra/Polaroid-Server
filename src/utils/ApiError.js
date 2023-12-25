class CustomError extends Error {
  constructor(statusCode, message, errors, stack) {
    super(message);
    this.statusCode = statusCode;
    this.data = null;
    this.message = message;
    this.success = false;
    this.error = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

const ApiErrorHandler = (err, req, res, next) => {
  const {
    statusCode = 500,
    message = "Internal Server Error",
    data,
    success,
    error,
    stack,
  } = err;

  console.error(err);

  res.status(statusCode).json({
    success: success,
    statusCode: statusCode,
    message: message,
    data: data,
    error: error,
  });
};

export { CustomError };
