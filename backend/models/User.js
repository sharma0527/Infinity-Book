const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        default: ''
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    history: {
        type: Object,
        default: {}
    },
    projects: {
        type: Array,
        default: []
    }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
