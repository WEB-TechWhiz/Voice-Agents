require('dotenv').config();
const express = require('express');
const multer  = require('multer');
const sttRoutes = require('./routes/stt.routes');

const app = express();
app.use(express.json());

const upload = multer({ dest: '/tmp/voiceai-audio/' });
app.set('upload', upload);

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'stt-service' }));
app.use('/', sttRoutes);

app.listen(process.env.PORT || 4003, () =>
  console.log(`stt-service running on :${process.env.PORT || 4003}`));
