class CustomError extends Error {
  constructor({ statusCode, message, error = {}, stack = "" }) {
    super(message);
    this.statusCode = statusCode;
    this.data = null;
    this.message = message;
    this.success = false;
    this.error = error;

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

  console.error(err.message);

  res.status(statusCode).json({
    success: success,
    statusCode: statusCode,
    message: message,
    data: data,
    error: error,
  });
};

export { CustomError, ApiErrorHandler };
