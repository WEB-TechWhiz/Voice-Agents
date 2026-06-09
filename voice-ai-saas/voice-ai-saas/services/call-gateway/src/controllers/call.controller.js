const axios   = require('axios');
const twilio  = require('twilio');
const { v4: uuidv4 } = require('uuid');
const { maskPhone } = require('../../../shared/utils/maskPhone');
const logger  = require('../../../shared/utils/logger');

const VoiceResponse = twilio.twiml.VoiceResponse;

// POST /webhook/call-connect
exports.handleIncoming = async (req, res) => {
  const { CallSid, From, To } = req.body;
  logger.info('Incoming call', { callSid: CallSid, from: maskPhone(From) });

  // Init session in session-service
  await axios.post(`${process.env.SESSION_SERVICE_URL}/sessions`, {
    callSid: CallSid, callerPhone: From, tenantPhone: To
  }).catch(err => logger.error('Session init failed', { err: err.message }));

  const twiml = new VoiceResponse();
  const gather = twiml.gather({
    input: 'speech',
    action: `/webhook/gather-response`,
    language: 'hi-IN',
    speechTimeout: 'auto',
    enhanced: true
  });
  gather.say({ language: 'hi-IN', voice: 'Polly.Aditi' },
    'Namaste! Muffincodes mein aapka swagat hai. Kripya apni baat karein.');

  res.type('text/xml').send(twiml.toString());
};

// POST /webhook/gather-response
exports.handleGather = async (req, res) => {
  const { CallSid, SpeechResult } = req.body;

  const twiml = new VoiceResponse();

  if (!SpeechResult) {
    twiml.say({ language: 'hi-IN' }, 'Mujhe aapki baat sunai nahi di. Dobara bolein.');
    twiml.redirect('/webhook/call-connect');
    return res.type('text/xml').send(twiml.toString());
  }

  try {
    // 1. STT already done by Twilio — SpeechResult is the transcript
    // 2. NLU
    const nluRes = await axios.post(`${process.env.NLU_SERVICE_URL}/process`, {
      callSid: CallSid, transcript: SpeechResult
    });
    const { response, shouldEndCall, needsHuman } = nluRes.data;

    // 3. TTS
    const ttsRes = await axios.post(`${process.env.TTS_SERVICE_URL}/synthesize`,
      { text: response }, { responseType: 'arraybuffer' });

    // Save audio to temp and stream via Twilio Play, OR just use Say for MVP
    if (shouldEndCall) {
      twiml.say({ language: 'hi-IN' }, response);
      twiml.hangup();
    } else if (needsHuman) {
      twiml.say({ language: 'hi-IN' }, response);
      twiml.dial(process.env.HUMAN_AGENT_NUMBER || '+91XXXXXXXXXX');
    } else {
      const gather = twiml.gather({
        input: 'speech', action: '/webhook/gather-response',
        language: 'hi-IN', speechTimeout: 'auto'
      });
      gather.say({ language: 'hi-IN' }, response);
    }
  } catch (err) {
    logger.error('Pipeline error', { callSid: CallSid, err: err.message });
    twiml.say({ language: 'hi-IN' }, 'Kuch technical problem aa gayi. Thodi der baad call karein.');
    twiml.hangup();
  }

  res.type('text/xml').send(twiml.toString());
};

// POST /webhook/call-status
exports.handleStatus = async (req, res) => {
  const { CallSid, CallStatus, CallDuration } = req.body;
  logger.info('Call status update', { callSid: CallSid, status: CallStatus, duration: CallDuration });
  await axios.post(`${process.env.SESSION_SERVICE_URL}/sessions/${CallSid}/close`, {
    status: CallStatus, duration: CallDuration
  }).catch(err => logger.warn('Session close failed', { err: err.message }));
  res.sendStatus(204);
};
