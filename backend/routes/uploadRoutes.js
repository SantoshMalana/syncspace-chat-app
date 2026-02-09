const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const { authenticate } = require('../middleware/authMiddleware');

// Upload single file
router.post('/single', authenticate, upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const fileUrl = `/uploads/${req.file.filename}`;

        res.status(200).json({
            message: 'File uploaded successfully',
            file: {
                filename: req.file.originalname,
                url: fileUrl,
                fileType: req.file.mimetype,
                fileSize: req.file.size,
            }
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});

// Upload multiple files
router.post('/multiple', authenticate, upload.array('files', 5), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const files = req.files.map(file => ({
            filename: file.originalname,
            url: `/uploads/${file.filename}`,
            fileType: file.mimetype,
            fileSize: file.size,
        }));

        res.status(200).json({
            message: 'Files uploaded successfully',
            files
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to upload files' });
    }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File size too large. Maximum size is 10MB.' });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ error: 'Too many files. Maximum is 5 files.' });
        }
        return res.status(400).json({ error: error.message });
    }

    if (error) {
        return res.status(400).json({ error: error.message });
    }

    next();
});

module.exports = router;
