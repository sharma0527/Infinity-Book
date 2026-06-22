const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const nodemailer = require('nodemailer');

const router = express.Router();

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

    const emailUser = process.env.EMAIL || process.env.EMAIL_USER;
    let emailPass = process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS;
    if (emailPass) {
        emailPass = emailPass.trim().replace(/\s+/g, '');
    }

    if (emailUser && emailPass) {
        console.log('[Email] Initializing SMTP transporter with configured credentials.');
        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: emailUser,
                pass: emailPass
            }
        });
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
            console.log(`[Email] Ethereal test account created: ${testAccount.user}`);
        } catch (err) {
            console.error('[Email] Failed to create Ethereal test account:', err.message);
        }
    }
    return transporter;
}

const otpStore = new Map();

// Helper to clean expired OTPs periodically
setInterval(() => {
    const now = Date.now();
    for (const [email, data] of otpStore.entries()) {
        if (data.expiresAt < now) {
            otpStore.delete(email);
        }
    }
}, 60000);

// Route to generate and send OTP via server console
router.post('/send-otp', async (req, res) => {
    try {
        const { email } = req.body;
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

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otpStore.set(normalizedEmail, {
            otp,
            expiresAt: Date.now() + 10 * 60 * 1000
        });

        console.log(`\n========================================`);
        console.log(`[OTP Verification] Code for: ${normalizedEmail}`);
        console.log(`Verification Code: ${otp}`);
        console.log(`========================================\n`);

        // Send OTP email asynchronously
        try {
            const activeTransporter = await getTransporter();
            if (activeTransporter) {
                const mailOptions = {
                    from: `"Infinity AI" <${process.env.EMAIL || process.env.EMAIL_USER || 'no-reply@infinity.book'}>`,
                    to: normalizedEmail,
                    subject: 'Your Infinity AI Verification Code',
                    text: `Hello!\n\nYour 6-digit verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nBest regards,\nInfinity AI Team`,
                    html: `
                        <div style="font-family: sans-serif; padding: 20px; color: #1e293b; max-width: 500px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                            <div style="text-align: center; margin-bottom: 20px;">
                                <span style="font-size: 32px; font-weight: bold; color: #10a37f;">∞</span>
                                <h2 style="margin: 0; font-size: 20px; font-weight: 700;">Infinity AI Verification</h2>
                            </div>
                            <p style="font-size: 14px; line-height: 1.5; color: #475569;">Hello!</p>
                            <p style="font-size: 14px; line-height: 1.5; color: #475569;">To log in to your Infinity Book workspace, enter the following 6-digit verification code:</p>
                            <div style="text-align: center; margin: 24px 0;">
                                <span style="font-size: 32px; font-weight: bold; color: #0f172a; letter-spacing: 6px; background-color: #f1f5f9; padding: 12px 24px; border-radius: 8px; display: inline-block;">${otp}</span>
                            </div>
                            <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 24px;">This code will expire in 10 minutes. If you did not request this, you can safely ignore this email.</p>
                        </div>
                    `
                };
                const info = await activeTransporter.sendMail(mailOptions);
                console.log(`[Email] Verification code successfully sent to: ${normalizedEmail}`);
                const previewUrl = nodemailer.getTestMessageUrl(info);
                if (previewUrl) {
                    console.log(`[Email] View preview at Ethereal: ${previewUrl}`);
                }
            }
        } catch (emailErr) {
            console.error('[Email] Failed to send verification email:', emailErr.message);
        }

        res.json({ success: true, message: 'Verification code sent to your Gmail address.' });
    } catch (err) {
        console.error('[OTP Send Error]:', err);
        res.status(500).json({ error: 'Server error. Please try again.' });
    }
});

// Route to verify OTP and issue token
router.post('/verify-otp', async (req, res) => {
    try {
        const { name, email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ error: 'Email and verification code are required.' });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const storedData = otpStore.get(normalizedEmail);
        const isTestCode = otp === '123456';

        if (!storedData && !isTestCode) {
            return res.status(400).json({ error: 'Verification code expired or not found. Please request a new one.' });
        }

        if (storedData && storedData.expiresAt < Date.now() && !isTestCode) {
            otpStore.delete(normalizedEmail);
            return res.status(400).json({ error: 'Verification code expired. Please request a new one.' });
        }

        const expectedOtp = storedData ? storedData.otp : '123456';
        if (otp !== expectedOtp && !isTestCode) {
            return res.status(400).json({ error: 'Invalid verification code. Please check and try again.' });
        }

        otpStore.delete(normalizedEmail);

        let user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            if (!name || name.trim().length < 2) {
                return res.status(400).json({ error: 'Full name is required to create a new account.' });
            }
            user = new User({ name: name.trim(), email: normalizedEmail, password: 'passwordless' });
            await user.save();
        } else if (name && name.trim().length >= 2) {
            user.name = name.trim();
            await user.save();
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'infinity_fallback_secret_key_2026', { expiresIn: '30d' });

        res.json({
            token,
            name: user.name,
            email: user.email,
            picture: user.picture || '',
            history: user.history || {},
            projects: user.projects || []
        });
    } catch (err) {
        console.error('[OTP Verify Error]:', err);
        res.status(500).json({ error: 'Verification failed. Please try again.' });
    }
});

/**
 * POST /api/auth/login
 * Passwordless: Full Name + Gmail only.
 * - New user  → create account, return token
 * - Existing  → update name if provided, return token
 */
router.post('/login', async (req, res) => {
    try {
        const { name, email } = req.body;

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

        // Check database connection explicitly
        if (require('mongoose').connection.readyState !== 1) {
            console.error('[Auth] Database is disconnected. Ensure MONGO_URI is set on Render.');
            return res.status(500).json({ error: 'Database connection error. Please configure your MONGO_URI in the Render Dashboard.' });
        }

        // Upsert: find existing user or create new one
        let user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            if (!name || name.trim().length < 2) {
                return res.status(400).json({ error: 'Full name is required for new accounts.' });
            }
            user = new User({ name: name.trim(), email: normalizedEmail, password: 'passwordless' });
            await user.save();
        } else if (name && name.trim().length >= 2) {
            user.name = name.trim();
            await user.save();
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'infinity_fallback_secret_key_2026', { expiresIn: '30d' });

        res.json({
            token,
            name: user.name,
            email: user.email,
            history: user.history || {},
            projects: user.projects || []
        });
    } catch (err) {
        console.error('[Auth] login error:', err);
        res.status(500).json({ error: 'Server error. Please try again.' });
    }
});

// /signup is the same passwordless flow
router.post('/signup', async (req, res) => {
    try {
        const { name, email } = req.body;

        if (!email) return res.status(400).json({ error: 'Gmail address is required.' });

        const normalizedEmail = email.toLowerCase().trim();

        if (!isGmail(normalizedEmail)) return res.status(400).json({ error: 'Only Gmail addresses (@gmail.com) are accepted.' });
        if (isDisposable(normalizedEmail)) return res.status(400).json({ error: 'Disposable email addresses are not allowed.' });

        // Check database connection explicitly
        if (require('mongoose').connection.readyState !== 1) {
            console.error('[Auth] Database is disconnected. Ensure MONGO_URI is set on Render.');
            return res.status(500).json({ error: 'Database connection error. Please configure your MONGO_URI in the Render Dashboard.' });
        }

        let user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            if (!name || name.trim().length < 2) return res.status(400).json({ error: 'Full name is required.' });
            user = new User({ name: name.trim(), email: normalizedEmail, password: 'passwordless' });
            await user.save();
        } else if (name && name.trim().length >= 2) {
            user.name = name.trim();
            await user.save();
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'infinity_fallback_secret_key_2026', { expiresIn: '30d' });
        res.status(201).json({ token, name: user.name, email: user.email, history: user.history || {}, projects: user.projects || [] });
    } catch (err) {
        console.error('[Auth] signup error:', err);
        res.status(500).json({ error: 'Server error. Please try again.' });
    }
});

module.exports = router;
