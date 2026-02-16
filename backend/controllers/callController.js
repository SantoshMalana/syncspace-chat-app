const Call = require('../models/Call');
const CallNotification = require('../models/CallNotification');

// Get call history for user
exports.getCallHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { workspaceId, callType, limit = 50 } = req.query;

    const query = {
      $or: [
        { caller: userId },
        { receiver: userId }
      ],
      status: { $in: ['ended', 'missed', 'declined'] }
    };

    if (workspaceId) {
      query.workspace = workspaceId;
    }

    if (callType) {
      query.callType = callType;
    }

    const calls = await Call.find(query)
      .populate('caller', 'name email avatar')
      .populate('receiver', 'name email avatar')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      calls
    });
  } catch (error) {
    console.error('Get call history error:', error);
    res.status(500).json({ message: 'Failed to get call history', error: error.message });
  }
};

// Get call by ID
exports.getCallById = async (req, res) => {
  try {
    const { callId } = req.params;
    const userId = req.user.id;

    const call = await Call.findById(callId)
      .populate('caller', 'name email avatar')
      .populate('receiver', 'name email avatar')
      .populate('workspace', 'name');

    if (!call) {
      return res.status(404).json({ message: 'Call not found' });
    }

    // Check if user is involved in this call
    if (!call.involvesUser(userId)) {
      return res.status(403).json({ message: 'You do not have access to this call' });
    }

    res.json({
      success: true,
      call
    });
  } catch (error) {
    console.error('Get call error:', error);
    res.status(500).json({ message: 'Failed to get call', error: error.message });
  }
};

// Update call status (used by socket handlers)
exports.updateCallStatus = async (req, res) => {
  try {
    const { callId } = req.params;
    const { status, startTime, endTime, duration } = req.body;
    const userId = req.user.id;

    const call = await Call.findById(callId);

    if (!call) {
      return res.status(404).json({ message: 'Call not found' });
    }

    // Check if user is involved in this call
    if (!call.involvesUser(userId)) {
      return res.status(403).json({ message: 'You do not have access to this call' });
    }

    // Update call details
    if (status) call.status = status;
    if (startTime) call.startTime = startTime;
    if (endTime) call.endTime = endTime;
    if (duration) call.duration = duration;

    await call.save();

    res.json({
      success: true,
      call
    });
  } catch (error) {
    console.error('Update call status error:', error);
    res.status(500).json({ message: 'Failed to update call', error: error.message });
  }
};

// Create a call record (called when initiating a call)
exports.createCall = async (req, res) => {
  try {
    const { receiverId, callType, workspaceId } = req.body;
    const callerId = req.user.id;

    // Validate that caller and receiver are different
    if (callerId === receiverId) {
      return res.status(400).json({ message: 'Cannot call yourself' });
    }

    // Create call record
    const call = new Call({
      caller: callerId,
      receiver: receiverId,
      callType,
      workspace: workspaceId,
      status: 'ringing'
    });

    await call.save();

    // Populate call details
    await call.populate('caller', 'name email avatar');
    await call.populate('receiver', 'name email avatar');

    // Create notification for receiver
    await CallNotification.createNotification({
      type: 'call',
      relatedId: call._id,
      user: receiverId,
      message: `Incoming ${callType} call from ${req.user.name}`
    });

    res.status(201).json({
      success: true,
      call
    });
  } catch (error) {
    console.error('Create call error:', error);
    res.status(500).json({ message: 'Failed to create call', error: error.message });
  }
};

// Get active calls for user
exports.getActiveCalls = async (req, res) => {
  try {
    const userId = req.user.id;

    const activeCalls = await Call.find({
      $or: [
        { caller: userId },
        { receiver: userId }
      ],
      status: { $in: ['ringing', 'ongoing'] }
    })
      .populate('caller', 'name email avatar')
      .populate('receiver', 'name email avatar')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      calls: activeCalls
    });
  } catch (error) {
    console.error('Get active calls error:', error);
    res.status(500).json({ message: 'Failed to get active calls', error: error.message });
  }
};

// Get call statistics for user
exports.getCallStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const { workspaceId } = req.query;

    const query = {
      $or: [
        { caller: userId },
        { receiver: userId }
      ]
    };

    if (workspaceId) {
      query.workspace = workspaceId;
    }

    // Total calls
    const totalCalls = await Call.countDocuments(query);

    // Calls by status
    const missedCalls = await Call.countDocuments({ ...query, status: 'missed' });
    const completedCalls = await Call.countDocuments({ ...query, status: 'ended' });
    const declinedCalls = await Call.countDocuments({ ...query, status: 'declined' });

    // Total call duration
    const callsWithDuration = await Call.find({ ...query, status: 'ended' }).select('duration');
    const totalDuration = callsWithDuration.reduce((sum, call) => sum + call.duration, 0);

    // Calls by type
    const voiceCalls = await Call.countDocuments({ ...query, callType: 'voice' });
    const videoCalls = await Call.countDocuments({ ...query, callType: 'video' });

    res.json({
      success: true,
      stats: {
        totalCalls,
        missedCalls,
        completedCalls,
        declinedCalls,
        totalDuration, // in seconds
        voiceCalls,
        videoCalls
      }
    });
  } catch (error) {
    console.error('Get call stats error:', error);
    res.status(500).json({ message: 'Failed to get call statistics', error: error.message });
  }
};