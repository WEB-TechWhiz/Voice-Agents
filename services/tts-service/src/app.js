const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const express = require('express');
const { logger, errorHandler, asyncHandler, http } = require('shared');

const app = express();
app.use(express.json());

app.post('/synthesize', asyncHandler(async (req, res) => {
  const text = req.body.text || '';
  logger.info('Speech synthesized', { callSid: req.body.callSid, chars: text.length });

  return http.success(req, res, {
    audioUrl: null,
    text,
    language: req.body.language || 'hinglish',
    provider: process.env.MOCK_MODE === 'true' ? 'mock-say' : 'external'
  }, 'Speech synthesized');
}));

app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'tts-service' });
});

app.use(errorHandler);

const PORT = process.env.PORT_TTS_SERVICE || 4006;
app.listen(PORT, () => {
  logger.info(`TTS Service running on port ${PORT}`);
});
