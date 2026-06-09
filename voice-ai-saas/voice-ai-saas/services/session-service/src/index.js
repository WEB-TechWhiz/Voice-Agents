require('dotenv').config();
const express = require('express');
const Redis   = require('ioredis');
const logger  = require('../../../shared/utils/logger');

const app   = express();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

app.use(express.json());

const SESSION_TTL = 3600;

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'session-service' }));

// Create session
app.post('/sessions', async (req, res) => {
  const { callSid, callerPhone, tenantPhone } = req.body;
  const session = { callSid, callerPhone, tenantPhone, startTime: Date.now(), history: [] };
  await redis.setex(`session:${callSid}`, SESSION_TTL, JSON.stringify(session));
  logger.info('Session created', { callSid });
  return res.status(201).json({ success: true, data: session });
});

// Get session
app.get('/sessions/:callSid', async (req, res) => {
  const raw = await redis.get(`session:${req.params.callSid}`);
  if (!raw) return res.status(404).json({ error: 'Session not found' });
  return res.json({ success: true, data: JSON.parse(raw) });
});

// Close session
app.post('/sessions/:callSid/close', async (req, res) => {
  const raw = await redis.get(`session:${req.params.callSid}`);
  if (raw) {
    const session = JSON.parse(raw);
    session.endTime  = Date.now();
    session.status   = req.body.status;
    session.duration = req.body.duration;
    await redis.setex(`session:${req.params.callSid}`, 1800, JSON.stringify(session)); // Keep 30 min after close
  }
  logger.info('Session closed', { callSid: req.params.callSid });
  return res.json({ success: true });
});

app.listen(process.env.PORT || 4009, () =>
  console.log(`session-service running on :${process.env.PORT || 4009}`));
