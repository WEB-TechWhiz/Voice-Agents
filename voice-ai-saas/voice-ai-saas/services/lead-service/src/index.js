require('dotenv').config();
const express  = require('express');
const mongoose = require('mongoose');
const leadRoutes = require('./routes/lead.routes');

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/voiceai')
  .then(() => console.log('MongoDB connected'))
  .catch(err => { console.error('MongoDB error:', err); process.exit(1); });

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'lead-service' }));
app.use('/leads', leadRoutes);

app.listen(process.env.PORT || 4005, () =>
  console.log(`lead-service running on :${process.env.PORT || 4005}`));
