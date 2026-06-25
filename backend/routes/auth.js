const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const { sendWelcomeEmail } = require('../services/emailService');
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

function isStrongPassword(password) {
    if (!password || password.length < 8) return false;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    return hasUppercase && hasLowercase && hasNumber && hasSpecial;
}

// 1. SIGNUP (Direct account creation)
router.post('/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'All fields are required.' });
        }

        const normalizedEmail = email.toLowerCase().trim();

        if (!isGmail(normalizedEmail)) {
            return res.status(400).json({ error: 'Only original Gmail addresses (@gmail.com) are accepted.' });
        }

        if (isDisposable(normalizedEmail)) {
            return res.status(400).json({ error: 'Disposable email addresses are not allowed.' });
        }

        if (!isStrongPassword(password)) {
            return res.status(400).json({ error: 'Password does not meet safety criteria (Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character).' });
        }

        // Check if user already exists
        let user = await User.findOne({ email: normalizedEmail });
        if (user && user.verified) {
            return res.status(400).json({ error: 'Email already registered. Please log in.' });
        }

        // Hash Password with cost factor 12
        const hashedPassword = await bcrypt.hash(password, 12);

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

        // Attempt to send welcome email in a non-blocking way
        let emailSent = false;
        try {
            console.log(`Attempting to send welcome email to ${normalizedEmail}...`);
            emailSent = await sendWelcomeEmail(normalizedEmail, user.name);
        } catch (mailErr) {
            console.error('[Welcome Email Error - non-blocking]:', mailErr);
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
            projects: user.projects || [],
            emailSent
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

// 2. LOGIN (Email + Password)
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });
        
        if (!user || !user.verified) {
            return res.status(401).json({ error: 'Incorrect Gmail address or password.' });
        }

        // Check password matching
        const matches = await bcrypt.compare(password, user.password);
        if (!matches) {
            return res.status(401).json({ error: 'Incorrect Gmail address or password.' });
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

module.exports = router;
