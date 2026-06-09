require('dotenv').config();
const express = require('express');
const callRoutes = require('./routes/call.routes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Twilio sends form-encoded

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'call-gateway' }));
app.use('/webhook', callRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => console.log(`call-gateway running on :${PORT}`));
