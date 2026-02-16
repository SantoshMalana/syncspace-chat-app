const express = require('express');
const router = express.Router();
const {
    createChannel,
    getWorkspaceChannels,
    getChannelById,
    getChannelDetails,
    addMemberByEmail,
    removeMemberFromChannel,
    promoteToAdmin,
    demoteFromAdmin,
    joinChannel,
    leaveChannel,
    updateChannel,
    deleteChannel,
    getChannelFiles,
} = require('../controllers/channelController');

const { authenticate } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticate);

// Channel CRUD
router.post('/', createChannel);
router.get('/workspace/:workspaceId', getWorkspaceChannels);
router.get('/:channelId', getChannelById);
router.get('/:channelId/details', getChannelDetails);
router.put('/:channelId', updateChannel);
router.delete('/:channelId', deleteChannel);
router.get('/:channelId/files', getChannelFiles);

// Member management
router.post('/:channelId/members', addMemberByEmail);
router.delete('/:channelId/members/:memberId', removeMemberFromChannel);
router.post('/:channelId/join', joinChannel);
router.post('/:channelId/leave', leaveChannel);

// Admin management
router.post('/:channelId/admins/:memberId', promoteToAdmin);
router.delete('/:channelId/admins/:memberId', demoteFromAdmin);

module.exports = router;