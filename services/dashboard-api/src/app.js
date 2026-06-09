const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const crypto = require('crypto');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { logger, errorHandler, AppError, asyncHandler, http } = require('shared');
const { Call, Lead, Tenant, User } = require('shared').models;

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/voiceai')
  .then(() => logger.info('Dashboard API connected to MongoDB'))
  .catch((error) => logger.error('MongoDB connection error in Dashboard API:', error));

const hashPassword = (password, salt = crypto.randomBytes(16).toString('hex')) => {
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
};

const verifyPassword = (password, stored) => {
  const [salt, hash] = stored.split(':');
  return hashPassword(password, salt) === `${salt}:${hash}`;
};

const signToken = (user) => jwt.sign(
  { userId: user._id, tenantId: user.tenantId, role: user.role },
  process.env.JWT_SECRET || 'dev_secret',
  { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
);

const requireAuth = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new AppError('Missing bearer token', 401));

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    return next();
  } catch (error) {
    return next(new AppError('Invalid or expired token', 401));
  }
};

app.post('/auth/register', asyncHandler(async (req, res, next) => {
  const { businessName, businessType, phone, email, password, name } = req.body;
  if (!businessName || !businessType || !phone || !email || !password || !name) {
    return next(new AppError('Missing required fields: businessName, businessType, phone, email, password, name', 400));
  }

  const tenant = await Tenant.create({ businessName, businessType, phone, email });
  const user = await User.create({
    tenantId: tenant._id,
    name,
    email,
    passwordHash: hashPassword(password),
    role: 'owner'
  });

  return http.success(req, res, {
    token: signToken(user),
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
    tenant
  }, 'Account registered', 201);
}));

app.post('/auth/login', asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email, isActive: true });
  if (!user || !verifyPassword(password || '', user.passwordHash)) {
    return next(new AppError('Invalid email or password', 401));
  }

  user.lastLogin = new Date();
  await user.save();
  return http.success(req, res, {
    token: signToken(user),
    user: { id: user._id, tenantId: user.tenantId, name: user.name, email: user.email, role: user.role }
  }, 'Logged in');
}));

app.get('/calls', requireAuth, asyncHandler(async (req, res) => {
  const calls = await Call.find({ tenantId: req.user.tenantId }).sort({ createdAt: -1 }).limit(100).populate('leadId');
  return http.success(req, res, calls, 'Calls fetched successfully');
}));

app.get('/leads', requireAuth, asyncHandler(async (req, res) => {
  const leads = await Lead.find({ tenantId: req.user.tenantId }).sort({ createdAt: -1 }).limit(100).populate('callId');
  return http.success(req, res, leads, 'Leads fetched successfully');
}));

app.put('/leads/:id', requireAuth, asyncHandler(async (req, res, next) => {
  const lead = await Lead.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.user.tenantId },
    { $set: req.body },
    { new: true }
  );
  if (!lead) return next(new AppError(`Lead with ID ${req.params.id} not found`, 404));
  return http.success(req, res, lead, 'Lead updated');
}));

app.get('/analytics/summary', requireAuth, asyncHandler(async (req, res) => {
  const tenantId = new mongoose.Types.ObjectId(req.user.tenantId);
  const [totalCalls, totalLeads, convertedLeads, topIntents] = await Promise.all([
    Call.countDocuments({ tenantId }),
    Lead.countDocuments({ tenantId }),
    Lead.countDocuments({ tenantId, status: 'converted' }),
    Call.aggregate([
      { $match: { tenantId } },
      { $group: { _id: '$intent', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ])
  ]);

  return http.success(req, res, {
    totalCalls,
    totalLeads,
    convertedLeads,
    leadRate: totalCalls ? Number(((totalLeads / totalCalls) * 100).toFixed(2)) : 0,
    topIntents
  }, 'Analytics summary fetched');
}));

app.get('/tenant/config', requireAuth, asyncHandler(async (req, res, next) => {
  const tenant = await Tenant.findById(req.user.tenantId);
  if (!tenant) return next(new AppError('Tenant not found', 404));
  return http.success(req, res, tenant, 'Tenant config fetched');
}));

app.put('/tenant/config', requireAuth, asyncHandler(async (req, res, next) => {
  const allowed = ['businessName', 'businessType', 'phone', 'defaultLanguage', 'workingHours', 'systemPromptConfig', 'integrations'];
  const update = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
  const tenant = await Tenant.findByIdAndUpdate(req.user.tenantId, { $set: update }, { new: true });
  if (!tenant) return next(new AppError('Tenant not found', 404));
  return http.success(req, res, tenant, 'Tenant config updated');
}));

app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'dashboard-api' });
});

app.use(errorHandler);

const PORT = process.env.PORT_DASHBOARD_API || 4002;
app.listen(PORT, () => {
  logger.info(`Dashboard API running on port ${PORT}`);
});
