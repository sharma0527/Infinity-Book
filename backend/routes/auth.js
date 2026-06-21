const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

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
