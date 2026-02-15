const Channel = require('../models/Channel');
const Workspace = require('../models/Workspace');
const Message = require('../models/Message');
const User = require('../models/User');

// Helper function to safely compare MongoDB ObjectIds
const compareIds = (id1, id2) => {
  if (!id1 || !id2) return false;
  
  // Handle both ObjectId and plain objects with _id
  const getId = (id) => {
    if (typeof id === 'string') return id;
    if (id._id) return id._id.toString();
    return id.toString();
  };
  
  return getId(id1) === getId(id2);
};

// Helper to check if user is workspace member
const isWorkspaceMember = (workspace, userId) => {
  if (!workspace || !workspace.members) return false;
  
  return workspace.members.some(member => {
    // Handle both populated and non-populated members
    const memberId = member.userId || member;
    return compareIds(memberId, userId);
  });
};

// Create channel
exports.createChannel = async (req, res) => {
  try {
    const { name, description, isPrivate, workspaceId } = req.body;
    const userId = req.user.id;

    console.log('📝 Creating channel:', { name, workspaceId, userId });

    // Verify workspace exists and user is a member
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    if (!isWorkspaceMember(workspace, userId)) {
      console.log('❌ User not a workspace member');
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

    console.log('✅ Channel created successfully');

    res.status(201).json({
      message: 'Channel created successfully',
      channel: populatedChannel,
    });

  } catch (error) {
    console.error('❌ Create channel error:', error);
    res.status(500).json({ error: 'Failed to create channel' });
  }
};

// Get workspace channels
exports.getWorkspaceChannels = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.id;

    console.log('📥 Fetching channels for workspace:', workspaceId, 'User:', userId);

    // Verify workspace exists
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      console.log('❌ Workspace not found:', workspaceId);
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Check if user is workspace member
    if (!isWorkspaceMember(workspace, userId)) {
      console.log('❌ User not a workspace member. Workspace members:', 
        workspace.members.map(m => ({
          userId: m.userId ? m.userId.toString() : m.toString(),
          role: m.role
        }))
      );
      return res.status(403).json({ error: 'Access denied' });
    }

    console.log('✅ User is workspace member');

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

    console.log('✅ Found', channels.length, 'channels');

    res.status(200).json({ channels });

  } catch (error) {
    console.error('❌ Get channels error:', error);
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
    if (channel.isPrivate && !channel.members.some(m => compareIds(m._id || m, userId))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.status(200).json({ channel });

  } catch (error) {
    console.error('❌ Get channel error:', error);
    res.status(500).json({ error: 'Failed to fetch channel' });
  }
};

// NEW: Get channel details with members
exports.getChannelDetails = async (req, res) => {
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
    if (channel.isPrivate && !channel.members.some(m => compareIds(m._id || m, userId))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.status(200).json({ channel });

  } catch (error) {
    console.error('❌ Get channel details error:', error);
    res.status(500).json({ error: 'Failed to fetch channel details' });
  }
};

// NEW: Add member to channel by email
exports.addMemberByEmail = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { email } = req.body;
    const userId = req.user.id;

    console.log('📧 Adding member to channel by email:', { channelId, email });

    // Find channel
    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    // Check if user is channel member (and has permission to add)
    if (!channel.members.some(m => compareIds(m, userId))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Find user by email
    const userToAdd = await User.findOne({ 
      email: email.toLowerCase().trim() 
    }).select('-password');

    if (!userToAdd) {
      return res.status(404).json({ error: 'User with this email not found in SyncSpace' });
    }

    // Check if user is in the workspace
    const workspace = await Workspace.findById(channel.workspaceId);
    const isInWorkspace = workspace.members.some(m => 
      compareIds(m.userId || m, userToAdd._id)
    );

    if (!isInWorkspace) {
      return res.status(400).json({ 
        error: 'User must be a workspace member first. Invite them to the workspace.' 
      });
    }

    // Check if already in channel
    if (channel.members.some(m => compareIds(m, userToAdd._id))) {
      return res.status(400).json({ error: 'User is already a member of this channel' });
    }

    // Add user to channel
    channel.members.push(userToAdd._id);
    await channel.save();

    const updatedChannel = await Channel.findById(channelId)
      .populate('members', 'fullName email avatar status');

    console.log('✅ Member added to channel successfully');

    res.status(200).json({
      message: 'Member added successfully',
      channel: updatedChannel,
    });

  } catch (error) {
    console.error('❌ Add member error:', error);
    res.status(500).json({ error: 'Failed to add member' });
  }
};

// NEW: Remove member from channel
exports.removeMemberFromChannel = async (req, res) => {
  try {
    const { channelId, memberId } = req.params;
    const userId = req.user.id;

    console.log('🗑️ Removing member from channel:', { channelId, memberId });

    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    // Cannot remove from general channel
    if (channel.name === 'general') {
      return res.status(400).json({ error: 'Cannot remove members from general channel' });
    }

    // Check permissions (channel creator or workspace admin)
    const workspace = await Workspace.findById(channel.workspaceId);
    const member = workspace.members.find(m => compareIds(m.userId || m, userId));
    
    const isChannelCreator = compareIds(channel.createdBy, userId);
    const isAdmin = member && (member.role === 'owner' || member.role === 'admin');

    if (!isChannelCreator && !isAdmin) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // Remove member
    channel.members = channel.members.filter(m => !compareIds(m, memberId));
    await channel.save();

    console.log('✅ Member removed from channel');

    res.status(200).json({ message: 'Member removed successfully' });

  } catch (error) {
    console.error('❌ Remove member error:', error);
    res.status(500).json({ error: 'Failed to remove member' });
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
    if (channel.members.some(m => compareIds(m, userId))) {
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
    console.error('❌ Join channel error:', error);
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
      m => !compareIds(m, userId)
    );

    await channel.save();

    res.status(200).json({ message: 'Left channel successfully' });

  } catch (error) {
    console.error('❌ Leave channel error:', error);
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
    if (!compareIds(channel.createdBy, userId)) {
      const workspace = await Workspace.findById(channel.workspaceId);
      const member = workspace.members.find(m => compareIds(m.userId || m, userId));

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
    console.error('❌ Update channel error:', error);
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
    const member = workspace.members.find(m => compareIds(m.userId || m, userId));

    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // Remove from workspace
    workspace.channels = workspace.channels.filter(
      c => !compareIds(c, channelId)
    );
    await workspace.save();

    // Delete all messages in channel
    await Message.deleteMany({ channelId });

    // Delete channel
    await Channel.findByIdAndDelete(channelId);

    res.status(200).json({ message: 'Channel deleted successfully' });

  } catch (error) {
    console.error('❌ Delete channel error:', error);
    res.status(500).json({ error: 'Failed to delete channel' });
  }
};