const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const express = require('express');
const { constants, logger, errorHandler, asyncHandler, http } = require('shared');

const app = express();
app.use(express.json());

const extractEntities = (text = '', existing = {}) => {
  const entities = { ...existing };
  const phone = text.match(/(\+91|0)?[6-9]\d{9}/);
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const name = text.match(/\b(?:my name is|name is|main|mai)\s+([A-Za-z\u0900-\u097F ]{2,30})/i);

  if (phone) entities.phone = phone[0];
  if (email) entities.email = email[0];
  if (name) entities.name = name[1].trim();
  return entities;
};

const classifyIntent = (text = '') => {
  const value = text.toLowerCase();
  if (/appointment|booking|book|doctor|visit|milna/.test(value)) return constants.INTENTS.BOOK_APPOINTMENT;
  if (/price|cost|demo|interested|enquiry|lead/.test(value)) return constants.INTENTS.CAPTURE_LEAD;
  if (/order|delivery|tracking/.test(value)) return constants.INTENTS.CHECK_ORDER_STATUS;
  if (/human|manager|agent|complaint/.test(value)) return constants.INTENTS.SPEAK_TO_HUMAN;
  if (/timing|hours|address|location|fees/.test(value)) return constants.INTENTS.GET_BUSINESS_INFO;
  if (/bye|thank|done|bas/.test(value)) return constants.INTENTS.GENERAL_QUERY;
  return constants.INTENTS.GENERAL_QUERY;
};

const buildResponse = (intent, entities) => {
  if (intent === constants.INTENTS.BOOK_APPOINTMENT) {
    return entities.name
      ? `Thanks ${entities.name}. Aapka appointment request note kar liya hai. Hamari team slot confirm karegi.`
      : 'Bilkul, appointment ke liye main madad kar sakta hoon. Aapka naam kya hai?';
  }
  if (intent === constants.INTENTS.CAPTURE_LEAD) {
    return entities.name
      ? `Thanks ${entities.name}. Hamari team pricing details ke saath jaldi contact karegi.`
      : 'Sure, details share karne ke liye pehle aapka naam bata dijiye.';
  }
  if (intent === constants.INTENTS.CHECK_ORDER_STATUS) {
    return 'Order status check karne ke liye aapka registered phone number confirm kar dijiye.';
  }
  if (intent === constants.INTENTS.SPEAK_TO_HUMAN) {
    return 'Main aapki request team ko forward kar raha hoon. Koi representative aapse jaldi baat karega.';
  }
  if (intent === constants.INTENTS.GET_BUSINESS_INFO) {
    return 'Hum Monday se Saturday, 10 AM se 7 PM tak available hain. Aap appointment bhi book kar sakte hain.';
  }
  return 'Samajh gaya. Kya main aapki appointment, pricing, ya business timing mein madad karun?';
};

app.post('/understand', asyncHandler(async (req, res) => {
  const transcript = req.body.transcript || '';
  const entities = extractEntities(transcript, req.body.entities || {});
  const intent = classifyIntent(transcript);
  const response = buildResponse(intent, entities);

  logger.info('Intent processed', { tenantId: req.body.tenantId, callSid: req.body.callSid, intent });
  return http.success(req, res, {
    intent,
    entities,
    response,
    shouldEndCall: /\b(bye|thank you|thanks|dhanyavaad)\b/i.test(transcript),
    needsHuman: intent === constants.INTENTS.SPEAK_TO_HUMAN,
    provider: process.env.MOCK_MODE === 'true' ? 'mock-rules' : 'llm'
  }, 'Intent processed');
}));

app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'nlu-service' });
});

app.use(errorHandler);

const PORT = process.env.PORT_NLU_SERVICE || 4005;
app.listen(PORT, () => {
  logger.info(`NLU Service running on port ${PORT}`);
});
