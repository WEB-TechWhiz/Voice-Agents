const crypto = require('crypto');
const { logger } = require('shared');

function verifyExotelSignature(req, res, next) {
  if (process.env.MOCK_MODE === 'true') {
    return next(); // Skip signature verification in mock mode
  }
  
  const sig = req.headers['x-exotel-signature'];
  if (!sig) {
    logger.warn('Missing X-Exotel-Signature header in webhook request');
    return res.status(401).json({ error: 'Missing webhook signature' });
  }
  
  const token = process.env.EXOTEL_API_TOKEN || '';
  // Raw body or stringified body depending on how parsing is set up. 
  // In Express, stringifying is okay but raw body buffer is more robust.
  const body = req.rawBody || JSON.stringify(req.body);
  
  const expected = crypto
    .createHmac('sha1', token)
    .update(body)
    .digest('hex');
    
  if (sig !== expected) {
    logger.warn('Invalid Exotel signature detected', { received: sig, expected });
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  next();
}

module.exports = verifyExotelSignature;
