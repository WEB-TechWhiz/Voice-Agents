const { v4: uuidv4 } = require('uuid');
const success = (res, data, message = 'Success', statusCode = 200, pagination = null) => {
  const response = { success: true, data, message, requestId: uuidv4() };
  if (pagination) response.pagination = pagination;
  return res.status(statusCode).json(response);
};
const error = (res, err, statusCode = 500) => {
  return res.status(statusCode).json({
    success: false,
    error: { code: err.code || 'INTERNAL_ERROR', message: err.message },
    requestId: uuidv4()
  });
};
module.exports = { success, error };
