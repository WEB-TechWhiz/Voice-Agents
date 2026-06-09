require('dotenv').config();
const express  = require('express');
const mongoose = require('mongoose');
const dashRoutes = require('./routes/dashboard.routes');

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/voiceai')
  .then(() => console.log('MongoDB connected'))
  .catch(err => { console.error(err); process.exit(1); });

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'dashboard-api' }));
app.use('/dashboard', dashRoutes);

app.listen(process.env.PORT || 4008, () =>
  console.log(`dashboard-api running on :${process.env.PORT || 4008}`));
