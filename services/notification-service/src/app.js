const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const express = require('express');
const { logger, errorHandler, asyncHandler, http } = require('shared');

const app = express();
app.use(express.json());

app.post('/notifications/post-call', asyncHandler(async (req, res) => {
  const { callSid, leadId, channel = 'whatsapp' } = req.body;
  logger.info('Post-call notification queued', { callSid, leadId, channel });

  return http.success(req, res, {
    callSid,
    leadId,
    channel,
    status: process.env.MOCK_MODE === 'true' ? 'mock_sent' : 'queued'
  }, 'Notification queued');
}));

app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'notification-service' });
});

app.use(errorHandler);

const PORT = process.env.PORT_NOTIFICATION_SERVICE || 4007;
app.listen(PORT, () => {
  logger.info(`Notification Service running on port ${PORT}`);
});
