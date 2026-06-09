const twilio = require('twilio');
const AppError = require('../../../shared/utils/AppError');

exports.validateTwilioSignature = (req, res, next) => {
  if (process.env.NODE_ENV === 'development') return next(); // Skip in dev
  const valid = twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN,
    req.headers['x-twilio-signature'],
    `${process.env.BASE_URL}${req.originalUrl}`,
    req.body
  );
  if (!valid) return next(new AppError('Invalid Twilio signature', 403, 'UNAUTHORIZED'));
  next();
};
