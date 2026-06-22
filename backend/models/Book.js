const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
    _id: {
        type: String,
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    title: {
        type: String,
        default: 'Untitled Book'
    },
    content: {
        type: Object, // Can be array of pages with html and strokes
        default: []
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model('Book', bookSchema);
