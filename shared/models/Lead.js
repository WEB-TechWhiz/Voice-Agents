const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  callId: { type: mongoose.Schema.Types.ObjectId, ref: 'Call', required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String },
  intent: { type: String },
  notes: { type: String },
  leadScore: { type: Number, min: 1, max: 10, default: 5 },
  status: { 
    type: String, 
    enum: ['new', 'contacted', 'converted', 'lost'], 
    default: 'new' 
  },
  whatsappSent: { type: Boolean, default: false },
  emailSent: { type: Boolean, default: false },
  crmSynced: { type: Boolean, default: false },
  crmId: { type: String }
}, {
  timestamps: true
});

module.exports = mongoose.model('Lead', leadSchema);
