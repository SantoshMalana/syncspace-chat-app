const express = require('express');
const router = express.Router();
const callController = require('../controllers/callController');
const { authenticate } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticate);

// Create a new call
router.post('/', callController.createCall);

// Get call history
router.get('/history', callController.getCallHistory);

// Get active calls
router.get('/active', callController.getActiveCalls);

// Get call statistics
router.get('/stats', callController.getCallStats);

// Get call by ID
router.get('/:callId', callController.getCallById);

// Update call status
router.put('/:callId', callController.updateCallStatus);

module.exports = router;