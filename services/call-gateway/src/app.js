const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const express = require('express');
const axios = require('axios');
const Redis = require('ioredis');
const { logger, errorHandler, AppError, asyncHandler } = require('shared');
const verifyExotelSignature = require('./middleware/verifySignature');

const app = express();

app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));
app.use(express.urlencoded({ extended: true }));

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  lazyConnect: true,
  maxRetriesPerRequest: 1
});

const memorySessions = new Map();
const urls = {
  lead: process.env.LEAD_SERVICE_URL || 'http://localhost:4003',
  stt: process.env.STT_SERVICE_URL || 'http://localhost:4004',
  nlu: process.env.NLU_SERVICE_URL || 'http://localhost:4005',
  tts: process.env.TTS_SERVICE_URL || 'http://localhost:4006'
};

const requireEnv = (name) => {
  const value = process.env[name];
  if (!value) throw new AppError(`Missing required environment variable: ${name}`, 500);
  return value;
};

const normalizeBaseUrl = (value) => String(value || '').replace(/\/+$/, '');

const validatePhoneNumber = (value, fieldName) => {
  if (!/^\+[1-9]\d{7,14}$/.test(String(value || ''))) {
    throw new AppError(`${fieldName} must be in E.164 format, for example +919876543210`, 400);
  }
};

const redisAvailable = async () => {
  try {
    if (['wait', 'close', 'end', 'reconnecting'].includes(redis.status)) {
      await redis.connect();
    }
    await redis.ping();
    return true;
  } catch (error) {
    logger.warn('Redis unavailable, using in-memory sessions', { error: error.message });
    return false;
  }
};

const sessionKey = (callSid) => `session:call:${callSid}`;

const saveSession = async (session) => {
  if (await redisAvailable()) {
    await redis.set(sessionKey(session.callSid), JSON.stringify(session), 'EX', 3600);
    return;
  }
  memorySessions.set(session.callSid, session);
};

const getSession = async (callSid) => {
  if (await redisAvailable()) {
    const payload = await redis.get(sessionKey(callSid));
    return payload ? JSON.parse(payload) : null;
  }
  return memorySessions.get(callSid) || null;
};

const deleteSession = async (callSid) => {
  if (await redisAvailable()) {
    await redis.del(sessionKey(callSid));
    return;
  }
  memorySessions.delete(callSid);
};

const xmlResponse = (res, text, audioUrl, shouldEndCall = false) => {
  const escapedText = String(text || '').replace(/[<>&'"]/g, (char) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    "'": '&apos;',
    '"': '&quot;'
  }[char]));

  const play = audioUrl ? `<Play>${audioUrl}</Play>` : `<Say>${escapedText}</Say>`;
  const next = shouldEndCall ? '<Hangup/>' : '<Gather input="speech" action="/webhook/speech-input" method="POST" timeout="5"/>';

  res.type('application/xml').send(`<Response>${play}${next}</Response>`);
};

const normalizeWebhook = (body) => ({
  callSid: body.CallSid || body.callSid || body.Sid || `mock_${Date.now()}`,
  callerPhone: String(body.Direction || '').startsWith('outbound')
    ? (body.To || body.Called || body.callerPhone || '+919999999999')
    : (body.From || body.Caller || body.callerPhone || '+919999999999'),
  exotelNumber: String(body.Direction || '').startsWith('outbound')
    ? (body.From || body.Caller || body.exotelNumber)
    : (body.To || body.Called || body.exotelNumber),
  speechText: body.SpeechResult || body.speechText || body.transcript || body.Body,
  audioUrl: body.RecordingUrl || body.audioUrl,
  status: body.CallStatus || body.status
});

const resolveTenant = async (payload) => {
  if (payload.tenantId || process.env.DEMO_TENANT_ID) {
    return payload.tenantId || process.env.DEMO_TENANT_ID;
  }

  const response = await axios.post(`${urls.lead}/tenants/resolve`, {
    exotelNumber: payload.exotelNumber,
    businessName: process.env.DEMO_BUSINESS_NAME || 'Demo Clinic',
    businessType: process.env.DEMO_BUSINESS_TYPE || 'clinic',
    phone: process.env.DEMO_BUSINESS_PHONE || '+919999999999',
    email: process.env.DEMO_BUSINESS_EMAIL || 'demo@voiceai.local'
  });

  return response.data.data._id;
};

app.post('/webhook/call-connect', verifyExotelSignature, asyncHandler(async (req, res) => {
  const payload = normalizeWebhook(req.body);
  const tenantId = await resolveTenant({ ...payload, tenantId: req.body.tenantId });

  const session = {
    callSid: payload.callSid,
    tenantId,
    callerPhone: payload.callerPhone,
    history: [],
    entities: {},
    startedAt: new Date().toISOString()
  };

  await saveSession(session);
  await axios.post(`${urls.lead}/calls`, {
    tenantId,
    callSid: payload.callSid,
    callerPhone: payload.callerPhone
  });

  const greeting = process.env.MOCK_GREETING || 'Namaste! Demo Clinic mein aapka swagat hai. Aap kis cheez ke liye call kar rahe hain?';
  logger.info('Call connected', { tenantId, callSid: payload.callSid, callerPhone: payload.callerPhone });
  xmlResponse(res, greeting);
}));

app.post('/calls/outbound', asyncHandler(async (req, res) => {
  const accountSid = requireEnv('TWILIO_ACCOUNT_SID');
  const authToken = requireEnv('TWILIO_AUTH_TOKEN');
  const from = req.body.from || process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_PHONE_NUMBER;
  const to = req.body.to;
  const publicBaseUrl = normalizeBaseUrl(req.body.publicBaseUrl || process.env.PUBLIC_BASE_URL);

  validatePhoneNumber(to, 'to');
  validatePhoneNumber(from, 'from');

  if (!publicBaseUrl || !/^https:\/\//.test(publicBaseUrl)) {
    throw new AppError('PUBLIC_BASE_URL must be a public HTTPS URL, for example an ngrok URL', 400);
  }

  const callbackBaseUrl = normalizeBaseUrl(req.body.statusCallbackBaseUrl || publicBaseUrl);
  const form = new URLSearchParams({
    To: to,
    From: from,
    Url: `${publicBaseUrl}/webhook/call-connect`,
    Method: 'POST',
    StatusCallback: `${callbackBaseUrl}/webhook/call-status`,
    StatusCallbackMethod: 'POST',
    StatusCallbackEvent: 'initiated ringing answered completed'
  });

  let response;
  try {
    response = await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`,
      form,
      {
        auth: { username: accountSid, password: authToken },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
  } catch (error) {
    const twilioError = error.response?.data || {};
    const message = twilioError.message || error.message || 'Twilio outbound call failed';
    logger.error('Twilio outbound call failed', {
      status: error.response?.status,
      code: twilioError.code,
      message
    });
    throw new AppError(`Twilio outbound call failed: ${message}`, error.response?.status || 502);
  }

  logger.info('Outbound Twilio call started', {
    callSid: response.data.sid,
    to,
    from
  });

  res.status(201).json({
    success: true,
    data: {
      sid: response.data.sid,
      status: response.data.status,
      to: response.data.to,
      from: response.data.from,
      direction: response.data.direction,
      webhookUrl: `${publicBaseUrl}/webhook/call-connect`
    }
  });
}));

app.get('/calls/outbound', (req, res) => {
  res.status(405).json({
    success: false,
    message: 'Use POST /calls/outbound with JSON body: { "to": "+919911624842" }'
  });
});

app.post('/webhook/speech-input', verifyExotelSignature, asyncHandler(async (req, res) => {
  const payload = normalizeWebhook(req.body);
  const session = await getSession(payload.callSid);
  if (!session) throw new AppError(`No active session for call ${payload.callSid}`, 404);

  const sttResponse = await axios.post(`${urls.stt}/transcribe`, {
    callSid: payload.callSid,
    audioUrl: payload.audioUrl,
    text: payload.speechText,
    language: session.language || 'hinglish'
  });

  const transcript = sttResponse.data.data.transcript;
  session.history.push({ speaker: 'caller', text: transcript, timestamp: new Date().toISOString() });

  const nluResponse = await axios.post(`${urls.nlu}/understand`, {
    tenantId: session.tenantId,
    callSid: payload.callSid,
    transcript,
    history: session.history,
    entities: session.entities
  });

  const nlu = nluResponse.data.data;
  session.intent = nlu.intent;
  session.entities = { ...session.entities, ...(nlu.entities || {}) };
  session.history.push({ speaker: 'agent', text: nlu.response, timestamp: new Date().toISOString() });
  await saveSession(session);

  await axios.put(`${urls.lead}/calls/${payload.callSid}`, {
    transcript: [
      { speaker: 'caller', text: transcript },
      { speaker: 'agent', text: nlu.response }
    ],
    intent: nlu.intent,
    entities: session.entities
  });

  if (nlu.intent === 'capture_lead' || nlu.intent === 'book_appointment') {
    await axios.post(`${urls.lead}/leads`, {
      tenantId: session.tenantId,
      callSid: payload.callSid,
      name: session.entities.name || 'Unknown Caller',
      phone: session.entities.phone || session.callerPhone,
      email: session.entities.email,
      intent: nlu.intent,
      notes: transcript
    }).catch((error) => {
      logger.warn('Lead capture skipped', { callSid: payload.callSid, error: error.message });
    });
  }

  const ttsResponse = await axios.post(`${urls.tts}/synthesize`, {
    callSid: payload.callSid,
    text: nlu.response,
    language: sttResponse.data.data.language || 'hinglish'
  });

  xmlResponse(res, nlu.response, ttsResponse.data.data.audioUrl, nlu.shouldEndCall);
}));

app.post('/webhook/call-status', verifyExotelSignature, asyncHandler(async (req, res) => {
  const payload = normalizeWebhook(req.body);
  const session = await getSession(payload.callSid);

  if (session) {
    await axios.put(`${urls.lead}/calls/${payload.callSid}`, {
      status: payload.status === 'failed' ? 'dropped' : 'completed',
      endedAt: new Date().toISOString(),
      duration: req.body.Duration || req.body.duration || 0
    }).catch((error) => logger.warn('Call final update failed', { callSid: payload.callSid, error: error.message }));
    await deleteSession(payload.callSid);
  }

  res.status(200).json({ success: true });
}));

app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'call-gateway' });
});

app.use(errorHandler);

const PORT = process.env.PORT_CALL_GATEWAY || 4001;
app.listen(PORT, () => {
  logger.info(`Call Gateway running on port ${PORT}`);
});
