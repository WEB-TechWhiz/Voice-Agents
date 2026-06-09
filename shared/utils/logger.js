const winston = require('winston');

// Regular expression to identify phone numbers: 
// E.164 format (e.g. +919876543210) or 10-digit Indian numbers
const phoneRegex = /(\+91|0)?[6-9]\d{9}/g;

const maskPhoneNumbers = (text) => {
  if (typeof text !== 'string') return text;
  return text.replace(phoneRegex, (match) => {
    // Keep first 5 digits (including country code if present) and mask the last 6
    const visibleLength = Math.max(match.length - 6, 3);
    return match.substring(0, visibleLength) + '******';
  });
};

const maskPIIFormat = winston.format((info) => {
  if (info.message) {
    info.message = maskPhoneNumbers(info.message);
  }
  // Also mask metadata fields if they contain callerPhone
  if (info.callerPhone) {
    info.callerPhone = maskPhoneNumbers(info.callerPhone);
  }
  return info;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    maskPIIFormat(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, requestId, tenantId, callSid, duration, ...metadata }) => {
          let metaStr = '';
          if (requestId) metaStr += ` [Req: ${requestId}]`;
          if (tenantId) metaStr += ` [Tenant: ${tenantId}]`;
          if (callSid) metaStr += ` [Call: ${callSid}]`;
          if (duration !== undefined) metaStr += ` [Dur: ${duration}s]`;
          
          const extraKeys = Object.keys(metadata);
          if (extraKeys.length > 0) {
            metaStr += ` ${JSON.stringify(metadata)}`;
          }
          return `[${timestamp}] ${level}:${metaStr} ${message}`;
        })
      )
    })
  ]
});

module.exports = logger;
