const Channel = require('../models/Channel');
const Workspace = require('../models/Workspace');
const Message = require('../models/Message');
const User = require('../models/User');

// Helper function to safely compare MongoDB ObjectIds
const compareIds = (id1, id2) => {
  if (!id1 || !id2) return false;

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
    const memberId = member.userId || member;
    return compareIds(memberId, userId);
  });
};

// Helper to check if user is workspace admin
const isWorkspaceAdmin = (workspace, userId) => {
  if (!workspace || !workspace.members) return false;

  const member = workspace.members.find(m => {
    const memberId = m.userId || m;
    return compareIds(memberId, userId);
  });

  return member && (member.role === 'owner' || member.role === 'admin');
};

// Helper to check if user is channel admin
const isChannelAdmin = (channel, userId) => {
  if (!channel) return false;

  // Creator is always admin
  if (compareIds(channel.createdBy, userId)) return true;

  // Check admins array
  if (channel.admins && channel.admins.length > 0) {
    return channel.admins.some(adminId => compareIds(adminId, userId));
  }

  return false;
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

    // Create channel - creator is automatically first admin
    const channel = new Channel({
      name: name.toLowerCase().replace(/\s+/g, '-'),
      description: description || '',
      workspaceId,
      isPrivate: isPrivate || false,
      members: [userId],
      createdBy: userId,
      admins: [userId], // Creator is first admin
    });

    await channel.save();

    // Add channel to workspace
    workspace.channels.push(channel._id);
    await workspace.save();

    const populatedChannel = await Channel.findById(channel._id)
      .populate('createdBy', 'fullName email avatar')
      .populate('members', 'fullName email avatar status')
      .populate('admins', 'fullName email avatar');

    console.log('✅ Channel created successfully with creator as admin');

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

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      console.log('❌ Workspace not found:', workspaceId);
      return res.status(404).json({ error: 'Workspace not found' });
    }

    if (!isWorkspaceMember(workspace, userId)) {
      console.log('❌ User not a workspace member');
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
      .populate('admins', 'fullName email avatar')
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
      .populate('members', 'fullName email avatar status')
      .populate('admins', 'fullName email avatar');

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

// Get channel details with members
exports.getChannelDetails = async (req, res) => {
  try {
    const { channelId } = req.params;
    const userId = req.user.id;

    const channel = await Channel.findById(channelId)
      .populate('createdBy', 'fullName email avatar')
      .populate('members', 'fullName email avatar status')
      .populate('admins', 'fullName email avatar');

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

// Add member to channel by email
exports.addMemberByEmail = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { email } = req.body;
    const userId = req.user.id;

    console.log('📧 Adding member to channel by email:', { channelId, email });

    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    // Check if user has permission to add members (must be admin or creator)
    const hasPermission = isChannelAdmin(channel, userId);

    if (!hasPermission) {
      // Also check if user is workspace admin
      const workspace = await Workspace.findById(channel.workspaceId);
      if (!isWorkspaceAdmin(workspace, userId)) {
        return res.status(403).json({ error: 'Only channel admins can add members' });
      }
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
      .populate('members', 'fullName email avatar status')
      .populate('admins', 'fullName email avatar');

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

// Remove member from channel
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

    // Cannot remove channel creator
    if (compareIds(channel.createdBy, memberId)) {
      return res.status(400).json({ error: 'Cannot remove channel creator' });
    }

    // Check permissions (channel admin or workspace admin)
    const workspace = await Workspace.findById(channel.workspaceId);
    const hasPermission = isChannelAdmin(channel, userId) || isWorkspaceAdmin(workspace, userId);

    if (!hasPermission) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // Remove member
    channel.members = channel.members.filter(m => !compareIds(m, memberId));

    // Also remove from admins if they were one
    if (channel.admins) {
      channel.admins = channel.admins.filter(a => !compareIds(a, memberId));
    }

    await channel.save();

    console.log('✅ Member removed from channel');

    res.status(200).json({ message: 'Member removed successfully' });

  } catch (error) {
    console.error('❌ Remove member error:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
};

// NEW: Promote member to admin
exports.promoteToAdmin = async (req, res) => {
  try {
    const { channelId, memberId } = req.params;
    const userId = req.user.id;

    console.log('⬆️ Promoting member to admin:', { channelId, memberId });

    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    // Check permissions - only existing admins can promote
    const workspace = await Workspace.findById(channel.workspaceId);
    const hasPermission = isChannelAdmin(channel, userId) || isWorkspaceAdmin(workspace, userId);

    if (!hasPermission) {
      return res.status(403).json({ error: 'Only admins can promote members' });
    }

    // Check if member is in channel
    if (!channel.members.some(m => compareIds(m, memberId))) {
      return res.status(400).json({ error: 'User is not a member of this channel' });
    }

    // Check if already admin
    if (channel.admins && channel.admins.some(a => compareIds(a, memberId))) {
      return res.status(400).json({ error: 'User is already an admin' });
    }

    // Add to admins
    if (!channel.admins) {
      channel.admins = [];
    }
    channel.admins.push(memberId);
    await channel.save();

    const updatedChannel = await Channel.findById(channelId)
      .populate('admins', 'fullName email avatar');

    console.log('✅ Member promoted to admin');

    res.status(200).json({
      message: 'Member promoted to admin successfully',
      channel: updatedChannel,
    });

  } catch (error) {
    console.error('❌ Promote to admin error:', error);
    res.status(500).json({ error: 'Failed to promote member' });
  }
};

// NEW: Demote admin to member
exports.demoteFromAdmin = async (req, res) => {
  try {
    const { channelId, memberId } = req.params;
    const userId = req.user.id;

    console.log('⬇️ Demoting admin to member:', { channelId, memberId });

    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    // Cannot demote channel creator
    if (compareIds(channel.createdBy, memberId)) {
      return res.status(400).json({ error: 'Cannot demote channel creator' });
    }

    // Check permissions
    const workspace = await Workspace.findById(channel.workspaceId);
    const hasPermission = isChannelAdmin(channel, userId) || isWorkspaceAdmin(workspace, userId);

    if (!hasPermission) {
      return res.status(403).json({ error: 'Only admins can demote other admins' });
    }

    // Remove from admins
    if (channel.admins) {
      channel.admins = channel.admins.filter(a => !compareIds(a, memberId));
      await channel.save();
    }

    console.log('✅ Admin demoted to member');

    res.status(200).json({ message: 'Admin demoted successfully' });

  } catch (error) {
    console.error('❌ Demote from admin error:', error);
    res.status(500).json({ error: 'Failed to demote admin' });
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
    channel.members = channel.members.filter(m => !compareIds(m, userId));

    // Also remove from admins if they were one
    if (channel.admins) {
      channel.admins = channel.admins.filter(a => !compareIds(a, userId));
    }

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
    const { name, description, topic, isPrivate } = req.body;
    const userId = req.user.id;

    const channel = await Channel.findById(channelId);

    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    // Check permissions - must be channel admin or workspace admin
    const workspace = await Workspace.findById(channel.workspaceId);
    const hasPermission = isChannelAdmin(channel, userId) || isWorkspaceAdmin(workspace, userId);

    if (!hasPermission) {
      return res.status(403).json({ error: 'Permission denied - only admins can update channels' });
    }

    // Update fields
    if (name) channel.name = name.toLowerCase().replace(/\s+/g, '-');
    if (description !== undefined) channel.description = description;
    if (topic !== undefined) channel.topic = topic;

    // Toggle channel privacy
    if (isPrivate !== undefined) {
      channel.isPrivate = isPrivate;
    }

    await channel.save();

    res.status(200).json({
      message: 'Channel updated successfully',
      channel: {
        _id: channel._id,
        name: channel.name,
        description: channel.description,
        isPrivate: channel.isPrivate,
        topic: channel.topic,
        createdBy: channel.createdBy,
        admins: channel.admins,
      },
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
    const hasPermission = isChannelAdmin(channel, userId) || isWorkspaceAdmin(workspace, userId);

    if (!hasPermission) {
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

// Get files shared in a channel
exports.getChannelFiles = async (req, res) => {
  try {
    const { channelId } = req.params;
    const userId = req.user.id;
    const { type } = req.query; // 'media' or 'files' or undefined (all)

    console.log('📂 Fetching files for channel:', { channelId, type });

    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    // Check access
    if (channel.isPrivate && !channel.members.some(m => compareIds(m, userId))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const query = {
      channelId,
      'attachments.0': { $exists: true }, // Messages with at least one attachment
      isDeleted: false
    };

    const messages = await Message.find(query)
      .select('attachments createdAt senderId')
      .populate('senderId', 'fullName avatar')
      .sort({ createdAt: -1 });

    let files = [];

    messages.forEach(msg => {
      msg.attachments.forEach(att => {
        // Filter by type if specified
        const isImage = att.fileType && att.fileType.startsWith('image/');
        const isVideo = att.fileType && att.fileType.startsWith('video/');

        if (type === 'media') {
          if (!isImage && !isVideo) return;
        } else if (type === 'files') {
          if (isImage || isVideo) return;
        }

        files.push({
          _id: msg._id, // Message ID as reference
          url: att.url,
          filename: att.filename,
          fileType: att.fileType,
          fileSize: att.fileSize,
          createdAt: msg.createdAt,
          sender: msg.senderId,
          isMedia: isImage || isVideo
        });
      });
    });

    console.log(`✅ Found ${files.length} files`);
    res.status(200).json({ files });

  } catch (error) {
    console.error('❌ Get channel files error:', error);
    res.status(500).json({ error: 'Failed to fetch channel files' });
  }
};
