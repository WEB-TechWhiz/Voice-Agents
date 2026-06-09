const logger = require('../../../shared/utils/logger');
exports.errorHandler = (err, req, res, next) => {
  logger.error(err.message, { stack: err.stack });
  const status = err.statusCode || 500;
  res.status(status).json({ success: false, error: { code: err.code, message: err.message } });
};
