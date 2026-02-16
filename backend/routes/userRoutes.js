const express = require('express');
const router = express.Router();
const { updateChannelPreferences } = require('../controllers/userController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

// Update channel preferences
router.put('/preferences/:channelId', updateChannelPreferences);

module.exports = router;
