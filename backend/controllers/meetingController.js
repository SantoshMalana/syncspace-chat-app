const Meeting = require('../models/Meeting');
const Workspace = require('../models/Workspace');
const User = require('../models/User');

// Helper to generate unique meeting link
const generateMeetingLink = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Create a new meeting
exports.createMeeting = async (req, res) => {
  try {
    const { title, description, scheduledFor, duration, workspaceId, channelId, participants } = req.body;
    const userId = req.user.id; // From authMiddleware

    // Validate workspace
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    // Create meeting
    const meeting = new Meeting({
      title,
      description,
      workspace: workspaceId,
      channel: channelId,
      creator: userId,
      scheduledFor: new Date(scheduledFor),
      duration: duration || 60,
      meetingLink: generateMeetingLink(),
      participants: participants ? participants.map(p => ({ user: p, status: 'invited' })) : [],
      status: 'scheduled'
    });

    // Add creator as participant
    meeting.participants.push({
      user: userId,
      status: 'accepted',
      joinedAt: new Date()
    });

    await meeting.save();

    // Populate for response
    await meeting.populate([
      { path: 'creator', select: 'fullName email avatar' },
      { path: 'participants.user', select: 'fullName email avatar' },
      { path: 'workspace', select: 'name' },
      { path: 'channel', select: 'name' }
    ]);

    res.status(201).json({
      message: 'Meeting created successfully',
      meeting
    });
  } catch (error) {
    console.error('Create meeting error:', error);
    res.status(500).json({ message: 'Failed to create meeting', error: error.message });
  }
};

// Get all meetings for user (in workspaces they belong to)
exports.getAllMeetings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { workspaceId, status } = req.query;

    let query = {
      'participants.user': userId
    };

    if (workspaceId) {
      query.workspace = workspaceId;
    }

    if (status) {
      if (status.includes(',')) {
        query.status = { $in: status.split(',') };
      } else {
        query.status = status;
      }
    }

    const meetings = await Meeting.find(query)
      .populate('creator', 'fullName email avatar')
      .populate('participants.user', 'fullName email avatar')
      .populate('workspace', 'name')
      .populate('channel', 'name')
      .sort({ scheduledFor: 1 });

    res.status(200).json({ meetings });
  } catch (error) {
    console.error('Get meetings error:', error);
    res.status(500).json({ message: 'Failed to fetch meetings' });
  }
};

// Get upcoming meetings specifically
exports.getUpcomingMeetings = async (req, res) => {
  try {
    const userId = req.user.id;

    const meetings = await Meeting.find({
      'participants.user': userId,
      status: { $in: ['scheduled', 'ongoing'] },
      scheduledFor: { $gte: new Date() }
    })
      .populate('creator', 'fullName email avatar')
      .populate('participants.user', 'fullName email avatar')
      .populate('workspace', 'name')
      .populate('channel', 'name')
      .sort({ scheduledFor: 1 })
      .limit(10);

    res.status(200).json({ meetings });
  } catch (error) {
    console.error('Get upcoming meetings error:', error);
    res.status(500).json({ message: 'Failed to fetch upcoming meetings' });
  }
};

// Get meeting by ID
exports.getMeetingById = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const userId = req.user.id;

    const meeting = await Meeting.findById(meetingId)
      .populate('creator', 'fullName email avatar')
      .populate('participants.user', 'fullName email avatar')
      .populate('workspace', 'name')
      .populate('channel', 'name');

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    // Check if user is participant or in workspace
    const isParticipant = meeting.participants.some(p => p.user._id.toString() === userId);

    // Also allow if user is in the workspace
    const workspace = await Workspace.findById(meeting.workspace._id);
    const isWorkspaceMember = workspace && workspace.members.some(m => {
      const mId = m.userId || m; // Handle populated or unpopulated members
      return mId.toString() === userId;
    });

    if (!isParticipant && !isWorkspaceMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.status(200).json({ meeting });
  } catch (error) {
    console.error('Get meeting error:', error);
    res.status(500).json({ message: 'Failed to fetch meeting' });
  }
};

// Update meeting status
exports.updateMeetingStatus = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    // Only creator can change status
    if (meeting.creator.toString() !== userId) {
      return res.status(403).json({ message: 'Only meeting creator can update status' });
    }

    meeting.status = status;

    if (status === 'ongoing' && !meeting.startedAt) {
      meeting.startedAt = new Date();
    } else if (status === 'completed' && !meeting.endedAt) {
      meeting.endedAt = new Date();
    }

    await meeting.save();
    res.status(200).json({ message: 'Meeting status updated', meeting });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ message: 'Failed to update meeting status' });
  }
};

// Cancel meeting
exports.cancelMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const userId = req.user.id;

    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    if (meeting.creator.toString() !== userId) {
      return res.status(403).json({ message: 'Only meeting creator can cancel' });
    }

    meeting.status = 'cancelled';
    await meeting.save();

    res.status(200).json({ message: 'Meeting cancelled' });
  } catch (error) {
    console.error('Cancel meeting error:', error);
    res.status(500).json({ message: 'Failed to cancel meeting' });
  }
};

// Update participant status
exports.updateParticipantStatus = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { status } = req.body; // 'accepted', 'declined', 'joined', 'left'
    const userId = req.user.id;

    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    const participantIndex = meeting.participants.findIndex(p => p.user.toString() === userId);

    if (participantIndex === -1) {
      // User not in participants list, add them if they are joining
      if (status === 'joined') {
        meeting.participants.push({
          user: userId,
          status: 'joined',
          joinedAt: new Date()
        });
      } else {
        return res.status(404).json({ message: 'Participant not found' });
      }
    } else {
      meeting.participants[participantIndex].status = status;

      if (status === 'joined') {
        meeting.participants[participantIndex].joinedAt = new Date();
      } else if (status === 'left') {
        meeting.participants[participantIndex].leftAt = new Date();
      }
    }

    await meeting.save();
    res.status(200).json({ message: 'Participant status updated' });
  } catch (error) {
    console.error('Update participant status error:', error);
    res.status(500).json({ message: 'Failed to update participant status' });
  }
};

// Join meeting by link
exports.joinMeeting = async (req, res) => {
  try {
    const { meetingLink } = req.params;
    const userId = req.user.id;

    const meeting = await Meeting.findOne({ meetingLink })
      .populate('creator', 'fullName email avatar')
      .populate('participants.user', 'fullName email avatar')
      .populate('workspace', 'name')
      .populate('channel', 'name');

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    if (meeting.status === 'cancelled' || meeting.status === 'completed') {
      return res.status(400).json({ message: 'Meeting is no longer active' });
    }

    // Add user to participants if not already there
    const isParticipant = meeting.participants.some(p => p.user._id.toString() === userId);
    if (!isParticipant) {
      meeting.participants.push({
        user: userId,
        status: 'joined',
        joinedAt: new Date()
      });
      await meeting.save();
    } else {
      // Update status to joined
      const participant = meeting.participants.find(p => p.user._id.toString() === userId);
      participant.status = 'joined';
      participant.joinedAt = new Date();
      await meeting.save();
    }

    res.status(200).json({ meeting });
  } catch (error) {
    console.error('Join meeting error:', error);
    res.status(500).json({ message: 'Failed to join meeting' });
  }
};
