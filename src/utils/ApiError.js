import { Result } from "./result.js";

class CustomError extends Error {
  constructor({ status, message, error = {}, stack = "" }) {
    super(message);
    this.status = status;
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
    status = 500,
    message = "Internal Server Error",
    data,
    success = false,
    error,
    stack,
  } = err;

  console.error(err);

  res.status(status).json(
    new Result({
      status: status,
      success: success,
      error: error,
      message: message,
      data: data,
    })
  );
};

export { CustomError, ApiErrorHandler };
