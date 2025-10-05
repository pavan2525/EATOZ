const Vendor = require('../models/Vendor');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const dotEnv = require('dotenv');

dotEnv.config();

const secretKey = process.env.JWT_SECRET || 'dev_secret';



const vendorRegister = async (req, res) => {
  const { firstName, lastName, email, password } = req.body;
  try {
    // Check if email already exists
    const existing = await Vendor.findOne({ email });

    // If account exists and is already verified, block reuse of email
    if (existing && existing.isVerified) {
      return res.status(400).json({ error: 'Email already taken' });
    }

    // If account exists but is NOT verified, refresh OTP and (optionally) update names/password
    if (existing && !existing.isVerified) {
      if (firstName) existing.firstName = firstName;
      if (lastName) existing.lastName = lastName;
      if (password) existing.password = await bcrypt.hash(password, 10);
      const newCode = existing.resendOTP(); // sets new code + 60s expiry
      await existing.save();
      console.log(`Resent OTP for ${existing.email}: ${newCode}`);
      return res.status(200).json({ message: 'Account exists but not verified. New OTP sent.' });
    }

    // Otherwise create a NEW unverified account and send OTP
    const hashedPassword = await bcrypt.hash(password, 10);
    const vendor = new Vendor({ firstName, lastName, email, password: hashedPassword });
    vendor.setOTP(); // 6-digit OTP, 60s expiry
    await vendor.save();

    console.log(`OTP for ${vendor.email}: ${vendor.verificationCode}`);
    return res.status(201).json({ message: 'Registered (pending verification). OTP sent to email.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const vendorLogin = async (req, res) => {
  const { email, password } = req.body;
  try {
    const vendor = await Vendor.findOne({ email });
    if (!vendor) return res.status(401).json({ error: 'Invalid email or password' });

    const ok = await bcrypt.compare(password, vendor.password);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

    if (!vendor.isVerified) return res.status(403).json({ error: 'Please verify your account via OTP' });

    const token = jwt.sign({ vendorId: vendor._id }, secretKey, { expiresIn: '1h' });
    return res.status(200).json({ success: 'Login successful', token, vendorId: vendor._id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const getAllVendors = async (req, res) => {
  try {
    const vendors = await Vendor.find({}, '-password -verificationCode -verificationExpires');
    return res.json({ vendors });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};


const getVendorById = async (req, res) => {
  const vendorId = req.params.id || req.params.apple;
  try {
    const vendor = await Vendor.findById(vendorId).select('-password -verificationCode -verificationExpires');
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
    return res.status(200).json({ vendorId: vendor._id, vendor });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Resend OTP (only if not verified)
const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const vendor = await Vendor.findOne({ email });
    if (!vendor) return res.status(404).json({ error: 'Account not found' });
    if (vendor.isVerified) return res.status(400).json({ error: 'Account already verified' });

    const newCode = vendor.resendOTP();
    await vendor.save();
    console.log(`Resent OTP for ${vendor.email}: ${newCode}`);
    return res.json({ message: 'OTP resent' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Verify OTP
const verifyOtp = async (req, res) => {
  try {
    const { email, code } = req.body;
    const vendor = await Vendor.findOne({ email });
    if (!vendor) return res.status(404).json({ error: 'Account not found' });

    const ok = vendor.verifyOTP(String(code));
    if (!ok) return res.status(400).json({ error: 'Invalid or expired OTP' });

    await vendor.save();
    return res.json({ message: 'Account verified successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};


module.exports = { vendorRegister, vendorLogin, getAllVendors, getVendorById, resendOtp, verifyOtp };