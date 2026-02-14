const Channel = require('../models/Channel');
const Workspace = require('../models/Workspace');
const Message = require('../models/Message');

// Create channel
exports.createChannel = async (req, res) => {
  try {
    const { name, description, isPrivate, workspaceId } = req.body;
    const userId = req.user.id;

    // Verify workspace exists and user is a member
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const isMember = workspace.members.some(
      member => member.userId.toString() === userId
    );

    if (!isMember) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if channel name already exists in workspace
    const existingChannel = await Channel.findOne({
      workspaceId,
      name: name.toLowerCase(),
    });

    if (existingChannel) {
      return res.status(400).json({ error: 'Channel name already exists' });
    }

    // Create channel
    const channel = new Channel({
      name: name.toLowerCase().replace(/\s+/g, '-'),
      description: description || '',
      workspaceId,
      isPrivate: isPrivate || false,
      members: [userId], // Creator is automatically a member
      createdBy: userId,
    });

    await channel.save();

    // Add channel to workspace
    workspace.channels.push(channel._id);
    await workspace.save();

    const populatedChannel = await Channel.findById(channel._id)
      .populate('createdBy', 'fullName email avatar')
      .populate('members', 'fullName email avatar status');

    res.status(201).json({
      message: 'Channel created successfully',
      channel: populatedChannel,
    });

  } catch (error) {
    console.error('Create channel error:', error);
    res.status(500).json({ error: 'Failed to create channel' });
  }
};

// Get workspace channels
exports.getWorkspaceChannels = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.id;

    // Verify user is workspace member
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const isMember = workspace.members.some(
      member => member.userId.toString() === userId
    );

    if (!isMember) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get all channels (public + private where user is member)
    const channels = await Channel.find({
      workspaceId,
      $or: [
        { isPrivate: false },
        { isPrivate: true, members: userId }
      ]
    })
      .populate('createdBy', 'fullName email avatar')
      .sort({ createdAt: 1 });

    res.status(200).json({ channels });

  } catch (error) {
    console.error('Get channels error:', error);
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
};

// Get channel by ID
exports.getChannelById = async (req, res) => {
  try {
    const { channelId } = req.params;
    const userId = req.user.id;

    const channel = await Channel.findById(channelId)
      .populate('createdBy', 'fullName email avatar')
      .populate('members', 'fullName email avatar status');

    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    // Check access
    if (channel.isPrivate && !channel.members.some(m => m._id.toString() === userId.toString())) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.status(200).json({ channel });

  } catch (error) {
    console.error('Get channel error:', error);
    res.status(500).json({ error: 'Failed to fetch channel' });
  }
};

// Join channel
exports.joinChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    const userId = req.user.id;

    const channel = await Channel.findById(channelId);

    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    // Check if private
    if (channel.isPrivate) {
      return res.status(403).json({ error: 'Cannot join private channel' });
    }

    // Check if already a member
    if (channel.members.includes(userId)) {
      return res.status(400).json({ error: 'Already a member' });
    }

    // Add user to channel
    channel.members.push(userId);
    await channel.save();

    const updatedChannel = await Channel.findById(channelId)
      .populate('members', 'fullName email avatar status');

    res.status(200).json({
      message: 'Joined channel successfully',
      channel: updatedChannel,
    });

  } catch (error) {
    console.error('Join channel error:', error);
    res.status(500).json({ error: 'Failed to join channel' });
  }
};

// Leave channel
exports.leaveChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    const userId = req.user.id;

    const channel = await Channel.findById(channelId);

    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    // Cannot leave general channel
    if (channel.name === 'general') {
      return res.status(400).json({ error: 'Cannot leave general channel' });
    }

    // Remove user from channel
    channel.members = channel.members.filter(
      m => m.toString() !== userId
    );

    await channel.save();

    res.status(200).json({ message: 'Left channel successfully' });

  } catch (error) {
    console.error('Leave channel error:', error);
    res.status(500).json({ error: 'Failed to leave channel' });
  }
};

// Update channel
exports.updateChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { name, description, topic } = req.body;
    const userId = req.user.id;

    const channel = await Channel.findById(channelId);

    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    // Check if user is creator or workspace admin
    if (channel.createdBy.toString() !== userId) {
      const workspace = await Workspace.findById(channel.workspaceId);
      const member = workspace.members.find(m => m.userId.toString() === userId);

      if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
        return res.status(403).json({ error: 'Permission denied' });
      }
    }

    // Update fields
    if (name) channel.name = name.toLowerCase().replace(/\s+/g, '-');
    if (description !== undefined) channel.description = description;
    if (topic !== undefined) channel.topic = topic;

    await channel.save();

    res.status(200).json({
      message: 'Channel updated successfully',
      channel,
    });

  } catch (error) {
    console.error('Update channel error:', error);
    res.status(500).json({ error: 'Failed to update channel' });
  }
};

// Delete channel
exports.deleteChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    const userId = req.user.id;

    const channel = await Channel.findById(channelId);

    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    // Cannot delete general channel
    if (channel.name === 'general') {
      return res.status(400).json({ error: 'Cannot delete general channel' });
    }

    // Check permissions
    const workspace = await Workspace.findById(channel.workspaceId);
    const member = workspace.members.find(m => m.userId.toString() === userId);

    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // Remove from workspace
    workspace.channels = workspace.channels.filter(
      c => c.toString() !== channelId
    );
    await workspace.save();

    // Delete all messages in channel
    await Message.deleteMany({ channelId });

    // Delete channel
    await Channel.findByIdAndDelete(channelId);

    res.status(200).json({ message: 'Channel deleted successfully' });

  } catch (error) {
    console.error('Delete channel error:', error);
    res.status(500).json({ error: 'Failed to delete channel' });
  }
};