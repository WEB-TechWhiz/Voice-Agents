const mongoose = require('mongoose');

// Inline schema — dashboard reads from same DB
const Lead = require('../../lead-service/src/models/Lead');

exports.getStats = async (req, res) => {
  const tenantId = req.tenant.id;
  const [totalCalls, newLeads, converted, todayCalls] = await Promise.all([
    Lead.countDocuments({ tenantId }),
    Lead.countDocuments({ tenantId, status: 'new' }),
    Lead.countDocuments({ tenantId, status: 'converted' }),
    Lead.countDocuments({ tenantId, createdAt: { $gte: new Date(new Date().setHours(0,0,0,0)) } }),
  ]);
  return res.json({ success: true, data: { totalCalls, newLeads, converted, todayCalls,
    conversionRate: totalCalls > 0 ? ((converted / totalCalls) * 100).toFixed(1) : '0.0' }});
};

exports.getRecentCalls = async (req, res) => {
  const leads = await Lead.find({ tenantId: req.tenant.id })
    .sort({ createdAt: -1 }).limit(20).select('callSid intent status language callDuration createdAt');
  return res.json({ success: true, data: leads });
};

exports.getLeadSummary = async (req, res) => {
  const summary = await Lead.aggregate([
    { $match: { tenantId: req.tenant.id } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);
  return res.json({ success: true, data: summary });
};
