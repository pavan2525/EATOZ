const mongoose = require('mongoose');

// Simple regex checks
const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
const PASSWORD_REGEX = /(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,16}/;

// Schema definition
const vendorSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },

  email: {
    type: String,
    required: true,
    unique: true,
    match: [EMAIL_REGEX, 'Invalid email']
  },

  password: {
    type: String,
    required: true,
    match: [PASSWORD_REGEX, 'Password must be 8–16 chars with uppercase, number & special char']
  },

  verificationCode: { type: String },
  verificationExpires: { type: Date },
  isVerified: { type: Boolean, default: false }
}, { timestamps: true });

// Generate a 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Set or resend OTP (valid for 60s)
vendorSchema.methods.setOTP = function () {
  this.verificationCode = generateOTP();
  this.verificationExpires = new Date(Date.now() + 60 * 1000);
  return this.verificationCode;
};

// Verify OTP
vendorSchema.methods.verifyOTP = function (code) {
  const stillValid = this.verificationExpires && Date.now() <= this.verificationExpires;
  if (stillValid && this.verificationCode === code) {
    this.isVerified = true;
    this.verificationCode = undefined;
    this.verificationExpires = undefined;
    return true;
  }
  return false;
};

// Auto-generate OTP on first save
vendorSchema.pre('save', function (next) {
  if (this.isNew && !this.verificationCode) this.setOTP();
  next();
});

module.exports = mongoose.model('Vendor', vendorSchema);