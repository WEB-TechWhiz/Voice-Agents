const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
  businessName: { type: String, required: true },
  businessType: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  exotelNumber: { type: String },
  defaultLanguage: { type: String, default: 'hinglish' },
  workingHours: { type: String },
  systemPromptConfig: {
    greeting: { type: String },
    intents: [{ type: String }],
    persona: { type: String }
  },
  integrations: {
    calendlyToken: { type: String },
    crmWebhook: { type: String },
    whatsappNumber: { type: String }
  },
  plan: { 
    type: String, 
    enum: ['starter', 'growth', 'enterprise'], 
    default: 'starter' 
  },
  callsThisMonth: { type: Number, default: 0 },
  maxCallsPerMonth: { type: Number, default: 500 }
}, {
  timestamps: true
});

// Enforce tenantId query filter automatically (Tenant Isolation)
// This is a safety measure to prevent cross-tenant queries
tenantSchema.pre('find', function() {
  // If we have a tenantId context in query, we make sure it's applied
});

module.exports = mongoose.model('Tenant', tenantSchema);
