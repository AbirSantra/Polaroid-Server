class Result {
  constructor({ status, success = false, error = null, message, data = null }) {
    this.status = status;
    this.success = success;
    this.error = error;
    this.message = message;
    this.data = data;
  }
}

export { Result };
