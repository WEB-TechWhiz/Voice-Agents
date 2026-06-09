const crypto = require('crypto');

const requestId = (req) => {
  const incoming = req.headers['x-request-id'];
  return incoming || `req_${crypto.randomBytes(8).toString('hex')}`;
};

const success = (req, res, data, message = 'OK', statusCode = 200, extra = {}) => {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
    requestId: requestId(req),
    ...extra
  });
};

module.exports = {
  requestId,
  success
};
