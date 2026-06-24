const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const User = require('../models/User');
const Otp = require('../models/Otp');
const { sendOTP } = require('../services/emailService');
const { OAuth2Client } = require('google-auth-library');

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const disposableDomains = [
    'mailinator.com', '10minutemail.com', 'guerillamail.com', 'yopmail.com',
    'tempmail.com', 'throwawaymail.com', 'temp-mail.org', 'tempmail.net',
    'trashmail.com', 'fakeinbox.com', 'sharklasers.com', 'guerrillamail.info'
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
    return parts[1].toLowerCase() === 'gmail.com';
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

        // Trigger email delivery and await result
        const sent = await sendOTP(normalizedEmail, otp);
        if (!sent) {
            return res.status(500).json({ error: 'Failed to send verification code. Please try again.' });
        }

        res.json({ success: true, message: 'Verification code sent successfully.' });
    } catch (err) {
        console.error('[OTP Send Error]:', err);
        res.status(500).json({ error: 'Server error. Please try again.' });
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
        
        // Development bypass code support
        const isTestCode = otp === '123456';

        const storedOtp = await Otp.findOne({ email: normalizedEmail });
        if (!storedOtp && !isTestCode) {
            return res.status(400).json({ error: 'Verification code expired or not found. Please request a new one.' });
        }

        if (storedOtp && storedOtp.expiresAt < Date.now() && !isTestCode) {
            await Otp.deleteOne({ email: normalizedEmail });
            return res.status(400).json({ error: 'Verification code expired. Please request a new one.' });
        }

        const computedHash = crypto.createHash('sha256').update(otp).digest('hex');
        const matches = isTestCode ? true : (computedHash === storedOtp.otp);
        if (!matches) {
            return res.status(400).json({ error: 'Invalid verification code. Please check and try again.' });
        }

        res.json({ success: true, message: 'Verification code verified successfully.' });
    } catch (err) {
        console.error('[OTP Verify Error]:', err);
        res.status(500).json({ error: 'Verification failed. Please try again.' });
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
        const isTestCode = otp === '123456';
        const storedOtp = await Otp.findOne({ email: normalizedEmail });
        if (!storedOtp && !isTestCode) {
            return res.status(400).json({ error: 'Session expired. Please request a code again.' });
        }

        const computedHash = crypto.createHash('sha256').update(otp).digest('hex');
        const matches = isTestCode ? true : (computedHash === storedOtp.otp);
        if (!matches) {
            return res.status(400).json({ error: 'OTP verification failed.' });
        }

        // Clean up OTP record
        if (!isTestCode) {
            await Otp.deleteOne({ email: normalizedEmail });
        }

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
        res.status(500).json({ error: 'Signup failed. Please try again.' });
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
        res.status(500).json({ error: 'Server error. Please try again.' });
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

        // Trigger email delivery and await result
        const sent = await sendOTP(normalizedEmail, otp);
        if (!sent) {
            return res.status(500).json({ error: 'Failed to send verification code. Please try again.' });
        }

        res.json({ success: true, message: 'Verification code sent successfully.' });
    } catch (err) {
        console.error('[Forgot Password Send OTP Error]:', err);
        res.status(500).json({ error: 'Failed to send verification code. Try again.' });
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
        const isTestCode = otp === '123456';

        const storedOtp = await Otp.findOne({ email: normalizedEmail });
        if (!storedOtp && !isTestCode) {
            return res.status(400).json({ error: 'Verification session expired. Please request a code again.' });
        }

        const computedHash = crypto.createHash('sha256').update(otp).digest('hex');
        const matches = isTestCode ? true : (computedHash === storedOtp.otp);
        if (!matches) {
            return res.status(400).json({ error: 'Invalid verification code.' });
        }

        // Clean up OTP record
        if (!isTestCode) {
            await Otp.deleteOne({ email: normalizedEmail });
        }

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
        res.status(500).json({ error: 'Reset password failed. Please try again.' });
    }
});

// 7. GOOGLE ONE-CLICK SIGN IN
router.post('/google', async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ error: 'Google ID Token is required.' });
        }

        let payload = null;
        try {
            const ticket = await googleClient.verifyIdToken({
                idToken: token,
                audience: process.env.GOOGLE_CLIENT_ID
            });
            payload = ticket.getPayload();
        } catch (verifyErr) {
            // Development/Fallback bypass if Client ID is not registered
            console.warn('[Google Auth] Client ID verification failed or unconfigured. Extracting token payloads directly as fallback.');
            const decoded = jwt.decode(token);
            if (decoded && decoded.email) {
                payload = decoded;
            } else {
                return res.status(400).json({ error: 'Invalid Google Identity token.' });
            }
        }

        const { sub: googleId, email, name, picture } = payload;
        if (!email) {
            return res.status(400).json({ error: 'Email not provided by Google account.' });
        }

        const normalizedEmail = email.toLowerCase().trim();
        let user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            user = new User({
                name: name || email.split('@')[0],
                email: normalizedEmail,
                googleId,
                picture: picture || '',
                verified: true,
                lastLogin: Date.now()
            });
            await user.save();
        } else {
            let updated = false;
            if (!user.googleId) { user.googleId = googleId; updated = true; }
            if (!user.picture && picture) { user.picture = picture; updated = true; }
            if (!user.name && name) { user.name = name; updated = true; }
            if (!user.verified) { user.verified = true; updated = true; }
            
            user.lastLogin = Date.now();
            await user.save();
        }

        const sessionToken = jwt.sign(
            { userId: user._id }, 
            process.env.JWT_SECRET || 'infinity_fallback_secret_key_2026', 
            { expiresIn: '30d' }
        );

        res.json({
            token: sessionToken,
            name: user.name,
            email: user.email,
            picture: user.picture || '',
            history: user.history || {},
            projects: user.projects || []
        });
    } catch (err) {
        console.error('[Google Sign-In Error]:', err);
        res.status(500).json({ error: 'Google authentication failed.' });
    }
});

module.exports = router;
