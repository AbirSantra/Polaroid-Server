const { CustomError } = require("./ApiError");

const requiredFieldsChecker = (req, fields) => {
  const missingFields = fields.filter((field) => !(field in req.body));

  if (missingFields.length > 0) {
    throw new CustomError({
      status: 400,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }
};

module.exports = { requiredFieldsChecker };
