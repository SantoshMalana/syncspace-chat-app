const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const channelController = require('../controllers/channelController');

// Create channel
router.post('/', authenticate, channelController.createChannel);

// Get workspace channels
router.get('/workspace/:workspaceId', authenticate, channelController.getWorkspaceChannels);

// Get channel by ID
router.get('/:channelId', authenticate, channelController.getChannelById);

// Join channel
router.post('/:channelId/join', authenticate, channelController.joinChannel);

// Leave channel
router.post('/:channelId/leave', authenticate, channelController.leaveChannel);

// Update channel
router.put('/:channelId', authenticate, channelController.updateChannel);

// Delete channel
router.delete('/:channelId', authenticate, channelController.deleteChannel);

module.exports = router;