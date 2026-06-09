const { Ollama } = require('ollama');
const Redis      = require('ioredis');
const logger     = require('../../../shared/utils/logger');
const { INTENTS } = require('../../../shared/constants/intents');

const ollama = new Ollama({ host: process.env.OLLAMA_HOST || 'http://localhost:11434' });
const redis  = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const SESSION_TTL = 3600; // 1 hour

function buildSystemPrompt(tenantConfig = {}) {
  const biz = tenantConfig.businessName || 'this business';
  const lang = tenantConfig.preferredLanguage || 'Hindi or English as per caller';
  const hours = tenantConfig.workingHours || '9 AM to 6 PM';
  return `You are an AI receptionist for ${biz}.
Language: Respond in ${lang}. Understand Hindi, English, and Hinglish naturally.
Working hours: ${hours}

Your goals:
1. Understand the caller's intent
2. Capture name and phone if not known
3. Complete their request or schedule a callback
4. Be warm, professional, and concise

STRICT RULES:
- Response MUST be under 40 words
- Ask ONE question at a time
- Never make up information not in context
- Never say you are an AI unless directly asked

Respond ONLY with valid JSON, no extra text:
{
  "intent": "<one of: ${Object.values(INTENTS).join(', ')}>",
  "entities": { "name": null, "phone": null, "date": null, "time": null },
  "response": "<spoken response under 40 words>",
  "shouldEndCall": false,
  "needsHuman": false
}`;
}

exports.process = async (req, res) => {
  const { callSid, transcript, tenantConfig } = req.body;

  if (!callSid || !transcript) {
    return res.status(400).json({ error: 'callSid and transcript required' });
  }

  try {
    // Load conversation history from Redis
    const historyRaw = await redis.get(`history:${callSid}`);
    const history    = historyRaw ? JSON.parse(historyRaw) : [];

    const messages = [
      { role: 'system', content: buildSystemPrompt(tenantConfig) },
      ...history,
      { role: 'user', content: transcript }
    ];

    const ollamaRes = await ollama.chat({
      model:   process.env.OLLAMA_MODEL || 'llama3.1:8b',
      messages,
      format:  'json',
      options: { temperature: 0.3, num_predict: 200 }
    });

    let parsed;
    try {
      parsed = JSON.parse(ollamaRes.message.content);
    } catch {
      logger.warn('JSON parse failed, using fallback', { callSid });
      parsed = {
        intent: INTENTS.GENERAL_QUERY,
        entities: {},
        response: 'Ek baar phir bolein, mujhe sahi se samajh nahi aaya.',
        shouldEndCall: false,
        needsHuman: false
      };
    }

    // Save updated history to Redis
    const updatedHistory = [
      ...history,
      { role: 'user', content: transcript },
      { role: 'assistant', content: JSON.stringify(parsed) }
    ].slice(-10); // Keep last 10 turns only
    await redis.setex(`history:${callSid}`, SESSION_TTL, JSON.stringify(updatedHistory));

    logger.info('NLU processed', { callSid, intent: parsed.intent });
    return res.json(parsed);

  } catch (err) {
    logger.error('NLU error', { callSid, err: err.message });
    return res.status(500).json({
      intent: INTENTS.GENERAL_QUERY,
      entities: {},
      response: 'Technical problem aa gayi. Thodi der mein dobara call karein.',
      shouldEndCall: true,
      needsHuman: false
    });
  }
};
