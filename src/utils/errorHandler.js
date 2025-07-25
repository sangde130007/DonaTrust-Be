class AppError extends Error {
	constructor(message, statusCode, details = null) {
		super(message);
		this.statusCode = statusCode;
		this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
		this.isOperational = true;
		this.details = details;

		Error.captureStackTrace(this, this.constructor);
	}
}

const handleCastErrorDB = (err) => {
	const message = `Invalid ${err.path}: ${err.value}`;
	return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
	const value = err.errmsg ? err.errmsg.match(/(["'])(\\?.)*?\1/)[0] : 'duplicate value';
	const message = `Duplicate field value: ${value}. Please use another value!`;
	return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
	const errors = Object.values(err.errors).map((val) => val.message);
	const message = `Invalid input data. ${errors.join('. ')}`;
	return new AppError(message, 400);
};

const handleJWTError = () => new AppError('Invalid token. Please log in again!', 401);

const handleJWTExpiredError = () => new AppError('Your token has expired! Please log in again.', 401);

const handleSequelizeValidationError = (err) => {
	const errors = err.errors.map((error) => ({
		field: error.path,
		message: error.message,
		value: error.value,
	}));

	return new AppError('Validation error', 400, errors);
};

const handleSequelizeUniqueConstraintError = (err) => {
	const field = err.errors[0].path;
	const value = err.errors[0].value;

	let message = `${field} '${value}' đã được sử dụng`;

	// Customize message based on field
	if (field === 'email') {
		message = 'Email này đã được sử dụng';
	} else if (field === 'phone') {
		message = 'Số điện thoại này đã được sử dụng';
	} else if (field === 'license_number') {
		message = 'Số giấy phép này đã được sử dụng';
	}

	return new AppError(message, 400);
};

const handleSequelizeForeignKeyConstraintError = (err) => {
	return new AppError('Dữ liệu');
};

const sendErrorDev = (err, res) => {
	res.status(err.statusCode).json({
		status: err.status,
		error: err,
		message: err.message,
		details: err.details,
		stack: err.stack,
	});
};

const sendErrorProd = (err, res) => {
	// Operational, trusted error: send message to client
	if (err.isOperational) {
		res.status(err.statusCode).json({
			status: err.status,
			message: err.message,
			details: err.details,
		});
	} else {
		// Programming or other unknown error: don't leak error details
		console.error('ERROR 💥', err);
		res.status(500).json({
			status: 'error',
			message: 'Something went wrong!',
		});
	}
};

module.exports = (err, req, res, next) => {
	err.statusCode = err.statusCode || 500;
	err.status = err.status || 'error';

	if (process.env.NODE_ENV === 'development') {
		sendErrorDev(err, res);
	} else if (process.env.NODE_ENV === 'production') {
		let error = { ...err };
		error.message = err.message;

		if (error.name === 'CastError') error = handleCastErrorDB(error);
		if (error.code === 11000) error = handleDuplicateFieldsDB(error);
		if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
		if (error.name === 'JsonWebTokenError') error = handleJWTError();
		if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
		if (error.name === 'SequelizeValidationError') error = handleSequelizeValidationError(error);
		if (error.name === 'SequelizeUniqueConstraintError') error = handleSequelizeUniqueConstraintError(error);
		if (error.name === 'SequelizeForeignKeyConstraintError')
			error = handleSequelizeForeignKeyConstraintError(error);

		sendErrorProd(error, res);
	}
};

module.exports.AppError = AppError;
