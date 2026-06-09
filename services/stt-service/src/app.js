const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const express = require('express');
const { logger, errorHandler, asyncHandler, http } = require('shared');

const app = express();
app.use(express.json());

const detectLanguage = (text = '') => {
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  if (/\b(karna|hai|haan|nahi|mujhe|appointment|demo|price)\b/i.test(text)) return 'hinglish';
  return 'en';
};

app.post('/transcribe', asyncHandler(async (req, res) => {
  const transcript = req.body.text || req.body.transcript || 'I want to book an appointment tomorrow';
  const language = req.body.language === 'auto' || !req.body.language ? detectLanguage(transcript) : req.body.language;

  logger.info('Transcription completed', { callSid: req.body.callSid, language });
  return http.success(req, res, {
    transcript,
    language,
    confidence: process.env.MOCK_MODE === 'true' ? 0.98 : 0.9,
    provider: process.env.MOCK_MODE === 'true' ? 'mock' : 'external'
  }, 'Transcription completed');
}));

app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'stt-service' });
});

app.use(errorHandler);

const PORT = process.env.PORT_STT_SERVICE || 4004;
app.listen(PORT, () => {
  logger.info(`STT Service running on port ${PORT}`);
});
