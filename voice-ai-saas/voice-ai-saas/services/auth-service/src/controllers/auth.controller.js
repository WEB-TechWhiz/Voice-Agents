const jwt    = require('jsonwebtoken');
const Tenant = require('../models/Tenant');
const logger = require('../../../shared/utils/logger');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

exports.register = async (req, res) => {
  try {
    const tenant = await Tenant.create(req.body);
    const token  = signToken(tenant._id);
    logger.info('Tenant registered', { tenantId: tenant._id });
    return res.status(201).json({ success: true, token, data: { id: tenant._id, businessName: tenant.businessName } });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Email already exists' });
    return res.status(500).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const tenant = await Tenant.findOne({ email }).select('+password');
  if (!tenant || !(await tenant.comparePassword(password)))
    return res.status(401).json({ error: 'Invalid credentials' });
  const token = signToken(tenant._id);
  return res.json({ success: true, token, data: { id: tenant._id, businessName: tenant.businessName, plan: tenant.plan } });
};

exports.requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
    req.tenant = await Tenant.findById(decoded.id);
    if (!req.tenant) return res.status(401).json({ error: 'Tenant not found' });
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

exports.me = (req, res) => res.json({ success: true, data: req.tenant });
