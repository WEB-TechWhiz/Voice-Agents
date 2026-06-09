const Lead   = require('../models/Lead');
const logger = require('../../../shared/utils/logger');
const { maskPhone } = require('../../../shared/utils/maskPhone');

exports.createLead = async (req, res) => {
  try {
    const lead = await Lead.create(req.body);
    logger.info('Lead created', { tenantId: lead.tenantId, intent: lead.intent, phone: maskPhone(lead.callerPhone) });
    return res.status(201).json({ success: true, data: lead });
  } catch (err) {
    logger.error('createLead error', { err: err.message });
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.getLeads = async (req, res) => {
  const { tenantId, status, page = 1, limit = 20 } = req.query;
  if (!tenantId) return res.status(400).json({ error: 'tenantId required' });
  const filter = { tenantId };
  if (status) filter.status = status;
  const [leads, total] = await Promise.all([
    Lead.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)),
    Lead.countDocuments(filter)
  ]);
  return res.json({ success: true, data: leads, pagination: { page: Number(page), limit: Number(limit), total } });
};

exports.getLead = async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  return res.json({ success: true, data: lead });
};

exports.updateLead = async (req, res) => {
  const lead = await Lead.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  return res.json({ success: true, data: lead });
};
