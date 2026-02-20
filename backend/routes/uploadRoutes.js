const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const { authenticate } = require('../middleware/authMiddleware');
const multer = require('multer');

router.post('/single', authenticate, upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    res.status(200).json({
      message: 'File uploaded successfully',
      file: {
        filename: req.file.originalname,
        url: req.file.path,        // ✅ Cloudinary full HTTPS URL
        fileType: req.file.mimetype,
        fileSize: req.file.size,
      }
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

router.post('/multiple', authenticate, upload.array('files', 5), (req, res) => {
  try {
    if (!req.files?.length) return res.status(400).json({ error: 'No files uploaded' });
    const files = req.files.map(file => ({
      filename: file.originalname,
      url: file.path,              // ✅ Cloudinary full HTTPS URL
      fileType: file.mimetype,
      fileSize: file.size,
    }));
    res.status(200).json({ message: 'Files uploaded successfully', files });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to upload files' });
  }
});

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'File too large. Max 10MB.' });
    if (err.code === 'LIMIT_FILE_COUNT') return res.status(400).json({ error: 'Max 5 files.' });
    return res.status(400).json({ error: err.message });
  }
  if (err) return res.status(400).json({ error: err.message });
  next();
});

module.exports = router;