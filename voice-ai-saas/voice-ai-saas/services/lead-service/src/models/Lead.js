const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  tenantId:    { type: String, required: true, index: true },
  callSid:     { type: String, required: true, unique: true },
  callerPhone: { type: String, required: true },
  name:        { type: String, default: null },
  intent:      { type: String, required: true },
  entities:    { type: mongoose.Schema.Types.Mixed, default: {} },
  transcript:  [{ role: String, content: String }],
  status:      { type: String, enum: ['new','contacted','converted','lost'], default: 'new' },
  callDuration:{ type: Number, default: 0 },
  language:    { type: String, default: 'hi' },
  followUpSent:{ type: Boolean, default: false },
}, { timestamps: true });

// Compound index for dashboard queries
leadSchema.index({ tenantId: 1, createdAt: -1 });
leadSchema.index({ tenantId: 1, status: 1 });

module.exports = mongoose.model('Lead', leadSchema);
