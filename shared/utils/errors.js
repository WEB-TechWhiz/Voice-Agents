class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Indicates that this is a trusted operational error
    
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  
  const response = {
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred'
    },
    requestId: req.headers['x-request-id'] || 'req_unknown'
  };

  // Log error using shared logger
  const logger = require('./logger');
  logger.error(err.message, {
    statusCode: err.statusCode,
    stack: err.stack,
    requestId: response.requestId
  });

  return res.status(err.statusCode).json(response);
};

module.exports = {
  AppError,
  errorHandler
};
