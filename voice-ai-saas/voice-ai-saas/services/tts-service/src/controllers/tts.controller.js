const axios  = require('axios');
const logger = require('../../../shared/utils/logger');

const TTS_HOST = process.env.TTS_HOST || 'http://localhost:8082';

exports.synthesize = async (req, res) => {
  const { text, callSid } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });

  try {
    const ttsRes = await axios.post(`${TTS_HOST}/synthesize`,
      { text },
      { responseType: 'arraybuffer', timeout: 10000 }
    );
    logger.info('TTS synthesized', { callSid, chars: text.length });
    res.set('Content-Type', 'audio/wav');
    return res.send(Buffer.from(ttsRes.data));
  } catch (err) {
    logger.error('TTS error', { callSid, err: err.message });
    return res.status(500).json({ error: 'TTS failed' });
  }
};
