const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const User = require('../models/User');
const Otp = require('../models/Otp');
const { sendOTP } = require('../services/emailService');
const router = express.Router();

const disposableDomains = [
    'mailinator.com', '10minutemail.com', 'guerillamail.com', 'yopmail.com',
    'tempmail.com', 'throwawaymail.com', 'temp-mail.org', 'tempmail.net',
    'trashmail.com', 'fakeinbox.com', 'sharklasers.com', 'guerrillamail.info',
    'gmailnator.com', 'maildrop.cc', 'dispostable.com', 'getairmail.com',
    'mintemail.com', 'maildominator.com', 'tempmailaddress.com'
];

function isDisposable(email) {
    const domain = email.split('@')[1];
    if (!domain) return true;
    return disposableDomains.includes(domain.toLowerCase());
}

function isGmail(email) {
    if (!email) return false;
    const parts = email.split('@');
    if (parts.length !== 2) return false;
    if (parts[1].toLowerCase() !== 'gmail.com') return false;
    
    // Block Gmail aliases using "+" to prevent fake/temporary registrations
    if (parts[0].includes('+')) return false;
    
    return true;
}

// Email helper functions are imported from emailService


// 1. SEND OTP (Signup/Spam protection/Resend Rate Limiter)
router.post('/send-otp', async (req, res) => {
    try {
        const { email, requestType } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Gmail address is required.' });
        }
        const normalizedEmail = email.toLowerCase().trim();
        if (!isGmail(normalizedEmail)) {
            return res.status(400).json({ error: 'Only Gmail addresses (@gmail.com) are accepted.' });
        }
        if (isDisposable(normalizedEmail)) {
            return res.status(400).json({ error: 'Disposable email addresses are not allowed.' });
        }

        // Check if signing up an already existing verified user
        if (requestType === 'signup') {
            const existingUser = await User.findOne({ email: normalizedEmail, verified: true });
            if (existingUser) {
                return res.status(400).json({ error: 'Email already registered. Please log in instead.' });
            }
        }

        // Enforce 60-second resend cooldown via DB timestamp
        const existingOtp = await Otp.findOne({ email: normalizedEmail });
        if (existingOtp) {
            const timeElapsed = Date.now() - existingOtp.updatedAt.getTime();
            const cooldown = 60 * 1000;
            if (timeElapsed < cooldown) {
                const remaining = Math.ceil((cooldown - timeElapsed) / 1000);
                return res.status(429).json({ error: `Please wait ${remaining} seconds before requesting a new code.` });
            }
        }

        // Generate and Hash OTP (using SHA-256 for sub-millisecond execution)
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
        
        await Otp.findOneAndUpdate(
            { email: normalizedEmail },
            { otp: hashedOtp, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
            { upsert: true, new: true }
        );

        console.log(`\n========================================`);
        console.log(`[OTP Verification] Code for: ${normalizedEmail}`);
        console.log(`Verification Code: ${otp}`);
        console.log(`========================================\n`);

        const sent = await sendOTP(normalizedEmail, otp);
        if(!sent){
            return res.status(500).json({
                success:false,
                error:"Unable to send OTP."
            });
        }

        res.json({ success: true, message: 'Verification code sent successfully.' });
    } catch (err) {
        console.error('[OTP Send Error]:', err);
        res.status(500).json({
            success: false,
            error: err.message,
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined
        });
    }
});

// 2. VERIFY OTP
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ error: 'Email and verification code are required.' });
        }

        const normalizedEmail = email.toLowerCase().trim();
        
        const storedOtp = await Otp.findOne({ email: normalizedEmail });
        if (!storedOtp) {
            return res.status(400).json({ error: 'Verification code expired or not found. Please request a new one.' });
        }

        if (storedOtp.expiresAt < Date.now()) {
            await Otp.deleteOne({ email: normalizedEmail });
            return res.status(400).json({ error: 'Verification code expired. Please request a new one.' });
        }

        const computedHash = crypto.createHash('sha256').update(otp).digest('hex');
        const matches = (computedHash === storedOtp.otp);
        if (!matches) {
            return res.status(400).json({ error: 'Invalid verification code. Please check and try again.' });
        }

        res.json({ success: true, message: 'Verification code verified successfully.' });
    } catch (err) {
        console.error('[OTP Verify Error]:', err);
        res.status(500).json({
            success: false,
            error: err.message,
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined
        });
    }
});

// 3. SIGNUP (OTP Verified + Password Creation)
router.post('/signup', async (req, res) => {
    try {
        const { name, email, password, otp } = req.body;
        if (!name || !email || !password || !otp) {
            return res.status(400).json({ error: 'All fields are required.' });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Security check: Verify the OTP again during account creation
        const storedOtp = await Otp.findOne({ email: normalizedEmail });
        if (!storedOtp) {
            return res.status(400).json({ error: 'Session expired. Please request a code again.' });
        }

        const computedHash = crypto.createHash('sha256').update(otp).digest('hex');
        const matches = (computedHash === storedOtp.otp);
        if (!matches) {
            return res.status(400).json({ error: 'OTP verification failed.' });
        }

        // Clean up OTP record
        await Otp.deleteOne({ email: normalizedEmail });

        // Check if user already exists
        let user = await User.findOne({ email: normalizedEmail });
        if (user && user.verified) {
            return res.status(400).json({ error: 'Email already registered. Please log in.' });
        }

        // Hash Password
        const hashedPassword = await bcrypt.hash(password, 10);

        if (user) {
            user.name = name.trim();
            user.password = hashedPassword;
            user.verified = true;
            user.lastLogin = Date.now();
            await user.save();
        } else {
            user = new User({
                name: name.trim(),
                email: normalizedEmail,
                password: hashedPassword,
                verified: true,
                lastLogin: Date.now()
            });
            await user.save();
        }

        const token = jwt.sign(
            { userId: user._id }, 
            process.env.JWT_SECRET || 'infinity_fallback_secret_key_2026', 
            { expiresIn: '30d' }
        );

        res.status(201).json({
            token,
            name: user.name,
            email: user.email,
            picture: user.picture || '',
            history: user.history || {},
            projects: user.projects || []
        });
    } catch (err) {
        console.error('[Signup Error]:', err);
        res.status(500).json({
            success: false,
            error: err.message,
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined
        });
    }
});

// 4. LOGIN (Email + Password)
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });
        
        if (!user || !user.verified) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // Check password matching
        const matches = await bcrypt.compare(password, user.password);
        if (!matches) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        user.lastLogin = Date.now();
        await user.save();

        const token = jwt.sign(
            { userId: user._id }, 
            process.env.JWT_SECRET || 'infinity_fallback_secret_key_2026', 
            { expiresIn: '30d' }
        );

        res.json({
            token,
            name: user.name,
            email: user.email,
            picture: user.picture || '',
            history: user.history || {},
            projects: user.projects || []
        });
    } catch (err) {
        console.error('[Login Error]:', err);
        res.status(500).json({
            success: false,
            error: err.message,
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined
        });
    }
});

// 5. FORGOT PASSWORD SEND OTP
router.post('/forgot-password/send-otp', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email address is required.' });
        }
        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail, verified: true });
        if (!user) {
            return res.status(404).json({ error: 'No verified account found with this email address.' });
        }

        // Enforce 60-second cooldown
        const existingOtp = await Otp.findOne({ email: normalizedEmail });
        if (existingOtp) {
            const timeElapsed = Date.now() - existingOtp.updatedAt.getTime();
            const cooldown = 60 * 1000;
            if (timeElapsed < cooldown) {
                const remaining = Math.ceil((cooldown - timeElapsed) / 1000);
                return res.status(429).json({ error: `Please wait ${remaining} seconds before requesting a new code.` });
            }
        }

        // Generate and Hash OTP (using SHA-256 for sub-millisecond execution)
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
        
        await Otp.findOneAndUpdate(
            { email: normalizedEmail },
            { otp: hashedOtp, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
            { upsert: true, new: true }
        );

        console.log(`\n========================================`);
        console.log(`[Forgot Password OTP] Code for: ${normalizedEmail}`);
        console.log(`Verification Code: ${otp}`);
        console.log(`========================================\n`);

        const sent = await sendOTP(normalizedEmail, otp);
        if(!sent){
            return res.status(500).json({
                success:false,
                error:"Unable to send OTP."
            });
        }

        res.json({ success: true, message: 'Verification code sent successfully.' });
    } catch (err) {
        console.error('[Forgot Password Send OTP Error]:', err);
        res.status(500).json({
            success: false,
            error: err.message,
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined
        });
    }
});

// 6. FORGOT PASSWORD RESET (Verifies OTP + resets password)
router.post('/forgot-password/reset', async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ error: 'Email, verification code, and new password are required.' });
        }

        const normalizedEmail = email.toLowerCase().trim();

        const storedOtp = await Otp.findOne({ email: normalizedEmail });
        if (!storedOtp) {
            return res.status(400).json({ error: 'Verification session expired. Please request a code again.' });
        }

        const computedHash = crypto.createHash('sha256').update(otp).digest('hex');
        const matches = (computedHash === storedOtp.otp);
        if (!matches) {
            return res.status(400).json({ error: 'Invalid verification code.' });
        }

        // Clean up OTP record
        await Otp.deleteOne({ email: normalizedEmail });

        const user = await User.findOne({ email: normalizedEmail, verified: true });
        if (!user) {
            return res.status(404).json({ error: 'Account not found.' });
        }

        // Hash New Password
        user.password = await bcrypt.hash(newPassword, 10);
        user.lastLogin = Date.now();
        await user.save();

        const token = jwt.sign(
            { userId: user._id }, 
            process.env.JWT_SECRET || 'infinity_fallback_secret_key_2026', 
            { expiresIn: '30d' }
        );

        res.json({
            success: true,
            message: 'Password reset successfully.',
            token,
            name: user.name,
            email: user.email,
            picture: user.picture || '',
            history: user.history || {},
            projects: user.projects || []
        });
    } catch (err) {
        console.error('[Forgot Password Reset Error]:', err);
        res.status(500).json({
            success: false,
            error: err.message,
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined
        });
    }
});

module.exports = router;
