require('dotenv').config();
const express = require('express');
const nluRoutes = require('./routes/nlu.routes');

const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'nlu-service' }));
app.use('/', nluRoutes);

app.listen(process.env.PORT || 4002, () =>
  console.log(`nlu-service running on :${process.env.PORT || 4002}`));
