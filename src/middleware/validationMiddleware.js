
  const { validationResult } = require('express-validator');
  const { AppError } = require('../utils/errorHandler');

  module.exports = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(errors.array()[0].msg, 400);
    }
    next();
  };
