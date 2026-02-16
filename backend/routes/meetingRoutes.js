const express = require('express');
const router = express.Router();
const meetingController = require('../controllers/meetingController');
const { authenticate } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticate);

// Create a new meeting
router.post('/', meetingController.createMeeting);

// Get all meetings for user
router.get('/', meetingController.getAllMeetings);

// Get upcoming meetings
router.get('/upcoming', meetingController.getUpcomingMeetings);

// Get meeting by ID
router.get('/:meetingId', meetingController.getMeetingById);

// Update meeting status
router.put('/:meetingId/status', meetingController.updateMeetingStatus);

// Cancel meeting
router.delete('/:meetingId', meetingController.cancelMeeting);

// Update participant status
router.put('/:meetingId/participant', meetingController.updateParticipantStatus);

// Join meeting by meeting link
router.post('/join/:meetingLink', meetingController.joinMeeting);

module.exports = router;