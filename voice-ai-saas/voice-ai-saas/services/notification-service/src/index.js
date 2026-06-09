require('dotenv').config();
const express = require('express');
const { initWhatsApp, sendFollowUp } = require('./whatsapp/client');
const notifyRoutes = require('./routes/notify.routes');

const app = express();
app.use(express.json());

initWhatsApp(); // Start WA client — shows QR on first run

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'notification-service' }));
app.use('/', notifyRoutes);

app.listen(process.env.PORT || 4006, () =>
  console.log(`notification-service running on :${process.env.PORT || 4006}`));
