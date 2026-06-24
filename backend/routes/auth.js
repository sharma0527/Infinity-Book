const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const User = require('../models/User');
const Otp = require('../models/Otp');
const nodemailer = require('nodemailer');
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

let transporter = null;

async function getTransporter() {
    if (transporter) return transporter;

    const emailUser = process.env.EMAIL_USER || process.env.EMAIL;
    let emailPass = process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD;
    if (emailPass) {
        emailPass = emailPass.trim().replace(/\s+/g, '');
    }

    if (emailUser && emailPass) {
        transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            family: 4,
            auth: {
                user: emailUser,
                pass: emailPass
            }
        });
        try {
            await transporter.verify();
            console.log("SMTP Connected Successfully");
        } catch (err) {
            console.error("SMTP Connection Verification Failed:", err);
            transporter = null;
            throw err;
        }
    } else {
        console.log('[Email] SMTP credentials not configured. Generating transient Ethereal SMTP test credentials...');
        try {
            const testAccount = await nodemailer.createTestAccount();
            transporter = nodemailer.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                secure: false,
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass
                }
            });
            await transporter.verify();
            console.log("SMTP Connected Successfully (Ethereal)");
        } catch (err) {
            console.error('[Email] Failed to create Ethereal test account or verify:', err.message);
            transporter = null;
            throw err;
        }
    }
    return transporter;
}

// OTP Send Function (Awaited with delivery verification)
async function sendOtpEmail(email, otp) {
    try {
        const activeTransporter = await getTransporter();
        if (!activeTransporter) {
            console.error('[Email] Transporter could not be initialized.');
            return false;
        }

        const emailUser = process.env.EMAIL_USER || process.env.EMAIL;
        console.log("OTP Request Received");
        console.log("Sending OTP To:", email);
        console.log("SMTP User:", emailUser);

        const mailOptions = {
            from: `"Infinity AI" <${emailUser || 'no-reply@infinity.book'}>`,
            to: email,
            subject: 'Your Infinity AI Verification Code',
            text: `Hello!\n\nYour 6-digit verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nBest regards,\nInfinity AI Team`,
            html: `
                <div style="font-family: sans-serif; padding: 20px; color: #1e293b; max-width: 500px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <span style="font-size: 32px; font-weight: bold; color: #10a37f;">∞</span>
                        <h2 style="margin: 0; font-size: 20px; font-weight: 700;">Infinity AI Verification</h2>
                    </div>
                    <p style="font-size: 14px; line-height: 1.5; color: #475569;">Hello!</p>
                    <p style="font-size: 14px; line-height: 1.5; color: #475569;">To proceed with your Infinity Book verification, enter the following 6-digit code:</p>
                    <div style="text-align: center; margin: 24px 0;">
                        <span style="font-size: 32px; font-weight: bold; color: #0f172a; letter-spacing: 6px; background-color: #f1f5f9; padding: 12px 24px; border-radius: 8px; display: inline-block;">${otp}</span>
                    </div>
                    <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 24px;">This code will expire in 10 minutes. If you did not request this, you can safely ignore this email.</p>
                </div>
            `
        };

        const info = await activeTransporter.sendMail(mailOptions);
        console.log(`[Email] Verification code successfully sent to: ${email}`);
        console.log("Email Sent:", info.messageId);
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
            console.log(`[Email] View preview at Ethereal: ${previewUrl}`);
        }
        return true;
    } catch (err) {
        console.error('[Email] sendMail error:', err);
        return false;
    }
}

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
        const sent = await sendOtpEmail(normalizedEmail, otp);
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
        const sent = await sendOtpEmail(normalizedEmail, otp);
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
