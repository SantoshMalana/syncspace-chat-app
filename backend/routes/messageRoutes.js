const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const messageController = require('../controllers/messageController');

// Channel messages
router.post('/channel', authenticate, messageController.sendChannelMessage);
router.get('/channel/:channelId', authenticate, messageController.getChannelMessages);

// Direct messages
router.post('/direct', authenticate, messageController.sendDirectMessage);
router.get('/direct/:userId', authenticate, messageController.getDirectMessages);
router.get('/conversations/:workspaceId', authenticate, messageController.getUserConversations);

// Message actions
router.put('/:messageId', authenticate, messageController.editMessage);
router.delete('/:messageId', authenticate, messageController.deleteMessage);
router.post('/:messageId/reaction', authenticate, messageController.addReaction);

module.exports = router;