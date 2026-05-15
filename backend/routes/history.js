const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Middleware to verify token
const authMiddleware = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

    try {
        const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(400).json({ error: 'Invalid token.' });
    }
};

router.post('/sync', authMiddleware, async (req, res) => {
    try {
        const { history, projects } = req.body;
        
        await User.findByIdAndUpdate(req.user.userId, { 
            history: history || {}, 
            projects: projects || [] 
        });

        res.json({ success: true, message: 'History synced securely to database.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to sync history.' });
    }
});

router.get('/sync', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        res.json({ history: user.history, projects: user.projects });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch history.' });
    }
});

module.exports = router;
