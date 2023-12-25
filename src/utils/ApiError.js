class CustomError extends Error {
  constructor(statusCode, message, errors = [], stack = "") {
    super(message);
    this.statusCode = statusCode;
    this.data = null;
    this.message = message;
    this.success = false;
    this.errors = errors;

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
    errors,
    stack,
  } = err;

  console.error(err);

  res.status(statusCode).json({
    success: success,
    statusCode: statusCode,
    message: message,
    data: data,
    errors: errors,
  });
};

export { CustomError, ApiErrorHandler };
