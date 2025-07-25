const { validationResult } = require('express-validator');
const { AppError } = require('../utils/errorHandler');

module.exports = (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const errorMessages = errors.array().map((error) => ({
			field: error.path,
			message: error.msg,
			value: error.value,
		}));

		throw new AppError(`Validation failed: ${errors.array()[0].msg}`, 400, errorMessages);
	}
	next();
};
