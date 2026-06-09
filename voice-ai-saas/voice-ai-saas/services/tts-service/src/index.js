require('dotenv').config();
const express = require('express');
const ttsRoutes = require('./routes/tts.routes');

const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'tts-service' }));
app.use('/', ttsRoutes);

app.listen(process.env.PORT || 4004, () =>
  console.log(`tts-service running on :${process.env.PORT || 4004}`));
