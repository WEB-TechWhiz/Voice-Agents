const axios    = require('axios');
const FormData = require('form-data');
const fs       = require('fs');
const ffmpeg   = require('fluent-ffmpeg');
const path     = require('path');
const logger   = require('../../../shared/utils/logger');
const { detectLanguage } = require('../utils/languageDetector');

async function convertToWav(inputPath) {
  const outputPath = inputPath + '.wav';
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioFrequency(16000)
      .audioChannels(1)
      .audioCodec('pcm_s16le')
      .format('wav')
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .save(outputPath);
  });
}

async function whisperTranscribe(wavPath, language = 'hi') {
  const form = new FormData();
  form.append('file', fs.createReadStream(wavPath));
  form.append('language', language);
  const res = await axios.post(
    `${process.env.WHISPER_HOST || 'http://localhost:8081'}/inference`,
    form, { headers: form.getHeaders(), timeout: 15000 }
  );
  return res.data.text?.trim() || '';
}

async function bhashiniTranscribe(wavPath) {
  const audioBase64 = fs.readFileSync(wavPath).toString('base64');
  const res = await axios.post(
    'https://dhruva-api.bhashini.gov.in/services/inference/pipeline',
    {
      pipelineTasks: [{
        taskType: 'asr',
        config: { language: { sourceLanguage: 'hi' }, audioFormat: 'wav', samplingRate: 16000 }
      }],
      inputData: { audio: [{ audioContent: audioBase64 }] }
    },
    { headers: { Authorization: process.env.BHASHINI_API_KEY }, timeout: 15000 }
  );
  return res.data.pipelineResponse?.[0]?.output?.[0]?.source || '';
}

exports.transcribe = async (req, res) => {
  const { file }    = req;
  const { callSid } = req.body;

  if (!file) return res.status(400).json({ error: 'audio file required' });

  let wavPath;
  try {
    wavPath = await convertToWav(file.path);
    let transcript = '';

    // Try Bhashini first for Hindi, fallback to Whisper
    if (process.env.BHASHINI_API_KEY) {
      try {
        transcript = await bhashiniTranscribe(wavPath);
      } catch {
        logger.warn('Bhashini failed, falling back to Whisper', { callSid });
        transcript = await whisperTranscribe(wavPath, 'hi');
      }
    } else {
      transcript = await whisperTranscribe(wavPath, 'auto');
    }

    const language = detectLanguage(transcript);
    logger.info('Transcription done', { callSid, language, length: transcript.length });

    return res.json({ transcript, language });

  } catch (err) {
    logger.error('STT error', { callSid, err: err.message });
    return res.status(500).json({ error: 'Transcription failed' });
  } finally {
    // Cleanup temp files
    if (file?.path) fs.unlink(file.path, () => {});
    if (wavPath)     fs.unlink(wavPath,    () => {});
  }
};
