const Meeting = require('../models/Meeting');
const CallNotification = require('../models/CallNotification');
const { v4: uuidv4 } = require('uuid');

// Create a new meeting
exports.createMeeting = async (req, res) => {
  try {
    const { title, description, channelId, workspaceId, scheduledFor, duration, participants, meetingType } = req.body;
    
    // Validate scheduled time is in the future
    if (new Date(scheduledFor) < new Date()) {
      return res.status(400).json({ message: 'Meeting must be scheduled for a future time' });
    }

    // Generate unique meeting link
    const meetingLink = uuidv4();

    // Create meeting
    const meeting = new Meeting({
      title,
      description,
      workspace: workspaceId,
      channel: channelId,
      creator: req.user.id,
      scheduledFor,
      duration: duration || 60,
      meetingLink,
      meetingType: meetingType || 'video',
      participants: participants.map(userId => ({
        user: userId,
        status: 'invited'
      }))
    });

    await meeting.save();

    // Populate meeting details
    await meeting.populate('creator', 'name email avatar');
    await meeting.populate('participants.user', 'name email avatar');
    await meeting.populate('channel', 'name');

    // Create notifications for all participants
    const notificationPromises = participants.map(userId => 
      CallNotification.createNotification({
        type: 'meeting',
        relatedId: meeting._id,
        user: userId,
        message: `You've been invited to "${title}" scheduled for ${new Date(scheduledFor).toLocaleString()}`
      })
    );

    await Promise.all(notificationPromises);

    res.status(201).json({
      success: true,
      meeting
    });
  } catch (error) {
    console.error('Create meeting error:', error);
    res.status(500).json({ message: 'Failed to create meeting', error: error.message });
  }
};

// Get meeting by ID
exports.getMeetingById = async (req, res) => {
  try {
    const { meetingId } = req.params;

    const meeting = await Meeting.findById(meetingId)
      .populate('creator', 'name email avatar')
      .populate('participants.user', 'name email avatar')
      .populate('channel', 'name')
      .populate('workspace', 'name');

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    // Check if user has access to this meeting
    const hasAccess = meeting.isParticipant(req.user.id) || meeting.isCreator(req.user.id);
    
    if (!hasAccess) {
      return res.status(403).json({ message: 'You do not have access to this meeting' });
    }

    res.json({
      success: true,
      meeting
    });
  } catch (error) {
    console.error('Get meeting error:', error);
    res.status(500).json({ message: 'Failed to get meeting', error: error.message });
  }
};

// Get upcoming meetings for user
exports.getUpcomingMeetings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { workspaceId } = req.query;

    const query = {
      'participants.user': userId,
      status: { $in: ['scheduled', 'ongoing'] },
      scheduledFor: { $gte: new Date() }
    };

    if (workspaceId) {
      query.workspace = workspaceId;
    }

    const meetings = await Meeting.find(query)
      .populate('creator', 'name email avatar')
      .populate('participants.user', 'name email avatar')
      .populate('channel', 'name')
      .sort({ scheduledFor: 1 });

    res.json({
      success: true,
      meetings
    });
  } catch (error) {
    console.error('Get upcoming meetings error:', error);
    res.status(500).json({ message: 'Failed to get meetings', error: error.message });
  }
};

// Get all meetings for user (including past)
exports.getAllMeetings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { workspaceId, status } = req.query;

    const query = {
      $or: [
        { 'participants.user': userId },
        { creator: userId }
      ]
    };

    if (workspaceId) {
      query.workspace = workspaceId;
    }

    if (status) {
      query.status = status;
    }

    const meetings = await Meeting.find(query)
      .populate('creator', 'name email avatar')
      .populate('participants.user', 'name email avatar')
      .populate('channel', 'name')
      .sort({ scheduledFor: -1 })
      .limit(50);

    res.json({
      success: true,
      meetings
    });
  } catch (error) {
    console.error('Get all meetings error:', error);
    res.status(500).json({ message: 'Failed to get meetings', error: error.message });
  }
};

// Update meeting status
exports.updateMeetingStatus = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { status } = req.body;

    const meeting = await Meeting.findById(meetingId);

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    // Only creator can update meeting status
    if (!meeting.isCreator(req.user.id)) {
      return res.status(403).json({ message: 'Only the meeting creator can update status' });
    }

    meeting.status = status;
    await meeting.save();

    res.json({
      success: true,
      meeting
    });
  } catch (error) {
    console.error('Update meeting status error:', error);
    res.status(500).json({ message: 'Failed to update meeting', error: error.message });
  }
};

// Cancel meeting
exports.cancelMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;

    const meeting = await Meeting.findById(meetingId);

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    // Only creator can cancel meeting
    if (!meeting.isCreator(req.user.id)) {
      return res.status(403).json({ message: 'Only the meeting creator can cancel the meeting' });
    }

    meeting.status = 'cancelled';
    await meeting.save();

    // Notify all participants
    const notificationPromises = meeting.participants.map(p => 
      CallNotification.createNotification({
        type: 'meeting',
        relatedId: meeting._id,
        user: p.user,
        message: `Meeting "${meeting.title}" has been cancelled`
      })
    );

    await Promise.all(notificationPromises);

    res.json({
      success: true,
      message: 'Meeting cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel meeting error:', error);
    res.status(500).json({ message: 'Failed to cancel meeting', error: error.message });
  }
};

// Update participant status
exports.updateParticipantStatus = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    const meeting = await Meeting.findById(meetingId);

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    // Find participant
    const participant = meeting.participants.find(p => p.user.toString() === userId);

    if (!participant) {
      return res.status(404).json({ message: 'You are not a participant of this meeting' });
    }

    // Update status
    participant.status = status;

    if (status === 'joined') {
      participant.joinedAt = new Date();
    } else if (status === 'left') {
      participant.leftAt = new Date();
    }

    await meeting.save();

    res.json({
      success: true,
      message: 'Participant status updated'
    });
  } catch (error) {
    console.error('Update participant status error:', error);
    res.status(500).json({ message: 'Failed to update status', error: error.message });
  }
};

// Join meeting (validates meeting link)
exports.joinMeeting = async (req, res) => {
  try {
    const { meetingLink } = req.params;
    const userId = req.user.id;

    const meeting = await Meeting.findOne({ meetingLink })
      .populate('creator', 'name email avatar')
      .populate('participants.user', 'name email avatar')
      .populate('channel', 'name');

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    // Check if user is a participant
    if (!meeting.isParticipant(userId) && !meeting.isCreator(userId)) {
      return res.status(403).json({ message: 'You are not invited to this meeting' });
    }

    // Check if meeting is active
    if (meeting.status === 'cancelled') {
      return res.status(400).json({ message: 'This meeting has been cancelled' });
    }

    if (meeting.status === 'completed') {
      return res.status(400).json({ message: 'This meeting has already ended' });
    }

    // Update meeting to ongoing if it's scheduled
    if (meeting.status === 'scheduled') {
      meeting.status = 'ongoing';
      await meeting.save();
    }

    res.json({
      success: true,
      meeting
    });
  } catch (error) {
    console.error('Join meeting error:', error);
    res.status(500).json({ message: 'Failed to join meeting', error: error.message });
  }
};