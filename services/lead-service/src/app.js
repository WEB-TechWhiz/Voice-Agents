const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const express = require('express');
const mongoose = require('mongoose');
const { logger, errorHandler, AppError, asyncHandler, http } = require('shared');
const { Call, Lead, Tenant } = require('shared').models;

const app = express();
app.use(express.json());

// Connect to MongoDB
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/voiceai';
mongoose.connect(mongoUri)
  .then(() => logger.info('Lead Service connected to MongoDB'))
  .catch(err => logger.error('MongoDB connection error in Lead Service:', err));

// Helpers
const calculateLeadScore = (intent, entities, notes) => {
  let score = 5; // Default score
  
  if (intent === 'book_appointment') score += 3;
  if (intent === 'capture_lead') score += 2;
  
  // If phone is verified and name exists
  if (entities && entities.name) score += 1;
  if (entities && entities.email) score += 1;
  
  // If notes contain buying signals like "interested", "price", "urgent"
  if (notes) {
    const lowercaseNotes = notes.toLowerCase();
    if (lowercaseNotes.includes('urgent') || lowercaseNotes.includes('now') || lowercaseNotes.includes('immediate')) {
      score += 2;
    }
    if (lowercaseNotes.includes('price') || lowercaseNotes.includes('cost') || lowercaseNotes.includes('discount')) {
      score += 1;
    }
  }
  
  return Math.min(Math.max(score, 1), 10); // Cap between 1 and 10
};

// Endpoints

// Resolve or create a tenant for local MVP demos
app.post('/tenants/resolve', asyncHandler(async (req, res) => {
  const {
    businessName = 'Demo Clinic',
    businessType = 'clinic',
    phone = '+919999999999',
    email = 'demo@voiceai.local',
    exotelNumber
  } = req.body;

  const query = exotelNumber ? { exotelNumber } : { email };
  let tenant = await Tenant.findOne(query);

  if (!tenant) {
    tenant = await Tenant.create({
      businessName,
      businessType,
      phone,
      email,
      exotelNumber,
      defaultLanguage: 'hinglish',
      workingHours: 'Mon-Sat, 10 AM - 7 PM',
      systemPromptConfig: {
        greeting: 'Namaste! Demo Clinic mein aapka swagat hai.',
        intents: ['book_appointment', 'capture_lead', 'get_business_info'],
        persona: 'Warm, concise Indian receptionist'
      }
    });
  }

  logger.info('Tenant resolved', { tenantId: tenant._id });
  return http.success(req, res, tenant, 'Tenant resolved');
}));

app.get('/tenants/:id', asyncHandler(async (req, res, next) => {
  const tenant = await Tenant.findById(req.params.id);
  if (!tenant) return next(new AppError(`Tenant with ID ${req.params.id} not found`, 404));
  return http.success(req, res, tenant, 'Tenant fetched');
}));

// Create Call
app.post('/calls', async (req, res, next) => {
  try {
    const { tenantId, callSid, callerPhone, callerName } = req.body;
    if (!tenantId || !callSid || !callerPhone) {
      return next(new AppError('Missing required fields: tenantId, callSid, callerPhone', 400));
    }

    const call = await Call.findOneAndUpdate(
      { callSid },
      {
        $setOnInsert: {
          tenantId,
          callSid,
          callerPhone,
          callerName: callerName || 'Unknown Caller',
          status: 'completed',
          startedAt: new Date()
        }
      },
      { new: true, upsert: true }
    );

    logger.info(`Created call record for ${callSid}`, { tenantId, callSid });
    res.status(201).json({ success: true, data: call });
  } catch (error) {
    next(error);
  }
});

// Update Call Transcript / Intent
app.put('/calls/:callSid', async (req, res, next) => {
  try {
    const { callSid } = req.params;
    const { transcript, intent, entities, status, duration, endedAt, recordingUrl, recordingDuration } = req.body;

    const call = await Call.findOne({ callSid });
    if (!call) {
      return next(new AppError(`Call with SID ${callSid} not found`, 404));
    }

    if (Array.isArray(transcript) && transcript.length > 0) {
      call.transcript.push(...transcript);
    }
    if (intent) call.intent = intent;
    if (entities) {
      // Merge entities
      const mergedEntities = new Map([...call.entities.entries(), ...Object.entries(entities)]);
      call.entities = mergedEntities;
    }
    if (status) call.status = status;
    if (duration !== undefined) call.duration = duration;
    if (endedAt) call.endedAt = new Date(endedAt);
    if (recordingUrl) call.recordingUrl = recordingUrl;
    if (recordingDuration !== undefined) call.recordingDuration = recordingDuration;

    await call.save();
    logger.info(`Updated call record for ${callSid}`, { tenantId: call.tenantId, callSid });
    res.status(200).json({ success: true, data: call });
  } catch (error) {
    next(error);
  }
});

// List Calls
app.get('/calls', asyncHandler(async (req, res) => {
  const { tenantId, limit = 25, page = 1, status, intent } = req.query;
  const query = {};
  if (tenantId) query.tenantId = tenantId;
  if (status) query.status = status;
  if (intent) query.intent = intent;

  const skip = (Number(page) - 1) * Number(limit);
  const [calls, total] = await Promise.all([
    Call.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).populate('leadId'),
    Call.countDocuments(query)
  ]);

  return http.success(req, res, calls, 'Calls fetched successfully', 200, {
    pagination: { page: Number(page), limit: Number(limit), total }
  });
}));

app.get('/calls/:callSid', asyncHandler(async (req, res, next) => {
  const call = await Call.findOne({ callSid: req.params.callSid }).populate('leadId');
  if (!call) return next(new AppError(`Call with SID ${req.params.callSid} not found`, 404));
  return http.success(req, res, call, 'Call fetched successfully');
}));

// Capture Lead
app.post('/leads', async (req, res, next) => {
  try {
    const { tenantId, callSid, name, phone, email, intent, notes } = req.body;
    if (!tenantId || !callSid || !name || !phone) {
      return next(new AppError('Missing required fields: tenantId, callSid, name, phone', 400));
    }

    const call = await Call.findOne({ callSid });
    if (!call) {
      return next(new AppError(`Call record with SID ${callSid} not found`, 404));
    }

    // Lead scoring logic
    const leadScore = calculateLeadScore(intent, { name, email }, notes);

    const lead = await Lead.findOneAndUpdate(
      { tenantId, callId: call._id, phone },
      {
        $set: {
          name,
          email,
          intent,
          notes,
          leadScore,
          status: 'new'
        },
        $setOnInsert: {
          tenantId,
          callId: call._id,
          phone
        }
      },
      { new: true, upsert: true }
    );

    // Link lead back to call
    call.leadCaptured = true;
    call.leadId = lead._id;
    if (name && name !== 'Unknown Caller') {
      call.callerName = name;
    }
    await call.save();

    logger.info(`Lead captured successfully for call ${callSid}. Lead Score: ${leadScore}`, { 
      tenantId, 
      callSid,
      leadId: lead._id 
    });

    res.status(201).json({ success: true, data: lead });
  } catch (error) {
    next(error);
  }
});

// List Leads
app.get('/leads', asyncHandler(async (req, res) => {
  const { tenantId, status, limit = 25, page = 1 } = req.query;
  const query = {};
  if (tenantId) query.tenantId = tenantId;
  if (status) query.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const [leads, total] = await Promise.all([
    Lead.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).populate('callId'),
    Lead.countDocuments(query)
  ]);

  return http.success(req, res, leads, 'Leads fetched successfully', 200, {
    pagination: { page: Number(page), limit: Number(limit), total }
  });
}));

app.get('/analytics/summary', asyncHandler(async (req, res) => {
  const { tenantId } = req.query;
  const query = tenantId ? { tenantId } : {};
  const aggregateMatch = tenantId && mongoose.Types.ObjectId.isValid(tenantId)
    ? { tenantId: new mongoose.Types.ObjectId(tenantId) }
    : query;
  const [totalCalls, totalLeads, convertedLeads, topIntents] = await Promise.all([
    Call.countDocuments(query),
    Lead.countDocuments(query),
    Lead.countDocuments({ ...query, status: 'converted' }),
    Call.aggregate([
      { $match: aggregateMatch },
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

// Update Lead Status
app.put('/leads/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes, email, name } = req.body;

    const lead = await Lead.findById(id);
    if (!lead) {
      return next(new AppError(`Lead with ID ${id} not found`, 404));
    }

    if (status) lead.status = status;
    if (notes) lead.notes = notes;
    if (email) lead.email = email;
    if (name) lead.name = name;

    await lead.save();
    logger.info(`Updated lead ${id}`, { tenantId: lead.tenantId, leadId: id });
    res.status(200).json({ success: true, data: lead });
  } catch (error) {
    next(error);
  }
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'lead-service' });
});

app.use(errorHandler);

const PORT = process.env.PORT_LEAD_SERVICE || 4003;
app.listen(PORT, () => {
  logger.info(`Lead Service running on port ${PORT}`);
});
