const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const tenantSchema = new mongoose.Schema({
  businessName:      { type: String, required: true },
  businessType:      { type: String, required: true }, // clinic, real_estate, restaurant, etc.
  email:             { type: String, required: true, unique: true, lowercase: true },
  password:          { type: String, required: true, select: false },
  phoneNumber:       { type: String, required: true },
  workingHours:      { type: String, default: '9 AM - 6 PM' },
  preferredLanguage: { type: String, default: 'hi', enum: ['hi', 'en', 'hinglish'] },
  plan:              { type: String, default: 'starter', enum: ['starter', 'growth', 'enterprise'] },
  isActive:          { type: Boolean, default: true },
  monthlyCallCount:  { type: Number, default: 0 },
}, { timestamps: true });

tenantSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

tenantSchema.methods.comparePassword = function (plainText) {
  return bcrypt.compare(plainText, this.password);
};

module.exports = mongoose.model('Tenant', tenantSchema);
