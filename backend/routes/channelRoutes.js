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

// NEW: Get channel details (with populated members)
router.get('/:channelId/details', authenticate, channelController.getChannelDetails);

// NEW: Add member to channel by email
router.post('/:channelId/members', authenticate, channelController.addMemberByEmail);

// NEW: Remove member from channel
router.delete('/:channelId/members/:memberId', authenticate, channelController.removeMemberFromChannel);

// Join channel
router.post('/:channelId/join', authenticate, channelController.joinChannel);

// Leave channel
router.post('/:channelId/leave', authenticate, channelController.leaveChannel);

// Update channel
router.put('/:channelId', authenticate, channelController.updateChannel);

// Delete channel
router.delete('/:channelId', authenticate, channelController.deleteChannel);

module.exports = router;