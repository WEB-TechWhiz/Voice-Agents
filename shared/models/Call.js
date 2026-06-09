const mongoose = require('mongoose');

const callSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  callSid: { type: String, required: true, unique: true, index: true },
  callerPhone: { type: String, required: true },
  callerName: { type: String, default: 'Unknown Caller' },
  duration: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ['completed', 'dropped', 'transferred'], 
    default: 'completed' 
  },
  language: { type: String, default: 'hinglish' },
  intent: { type: String },
  entities: { type: Map, of: String, default: {} },
  transcript: [{
    speaker: { type: String, enum: ['agent', 'caller'], required: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  recordingUrl: { type: String },
  recordingDuration: { type: Number },
  leadCaptured: { type: Boolean, default: false },
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date }
}, {
  timestamps: true
});

module.exports = mongoose.model('Call', callSchema);
