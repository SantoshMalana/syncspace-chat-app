const Workspace = require('../models/Workspace');
const Channel = require('../models/Channel');
const User = require('../models/User');
const crypto = require('crypto');

// Generate unique invite code
const generateInviteCode = () => {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
};

// Create workspace
exports.createWorkspace = async (req, res) => {
  try {
    const { name, description } = req.body;
    const userId = req.user.id; // From auth middleware

    // Generate slug from name
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');

    // Check if slug already exists
    const existingWorkspace = await Workspace.findOne({ slug });
    if (existingWorkspace) {
      return res.status(400).json({ error: 'Workspace name already taken' });
    }

    // Create workspace
    const workspace = new Workspace({
      name,
      slug,
      description: description || '',
      ownerId: userId,
      members: [{
        userId: userId,
        role: 'owner',
        joinedAt: new Date(),
      }],
      inviteCode: generateInviteCode(),
    });

    await workspace.save();

    // Create default "general" channel
    const generalChannel = new Channel({
      name: 'general',
      description: 'Default channel for workspace-wide communication',
      workspaceId: workspace._id,
      isPrivate: false,
      members: [userId],
      createdBy: userId,
    });

    await generalChannel.save();

    // Add channel to workspace
    workspace.channels.push(generalChannel._id);
    await workspace.save();

    // Add workspace to user
    await User.findByIdAndUpdate(userId, {
      $push: { workspaces: workspace._id },
      currentWorkspace: workspace._id,
    });

    res.status(201).json({
      message: 'Workspace created successfully',
      workspace,
      defaultChannel: generalChannel,
    });

  } catch (error) {
    console.error('Create workspace error:', error);
    res.status(500).json({ error: 'Failed to create workspace' });
  }
};

// Get user's workspaces
exports.getUserWorkspaces = async (req, res) => {
  try {
    const userId = req.user.id;

    const workspaces = await Workspace.find({
      'members.userId': userId,
    })
      .populate('ownerId', 'fullName email avatar')
      .populate('channels')
      .sort({ updatedAt: -1 });

    res.status(200).json({ workspaces });

  } catch (error) {
    console.error('Get workspaces error:', error);
    res.status(500).json({ error: 'Failed to fetch workspaces' });
  }
};

// Get workspace by ID
exports.getWorkspaceById = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.id;

    const workspace = await Workspace.findById(workspaceId)
      .populate('ownerId', 'fullName email avatar')
      .populate('channels')
      .populate('members.userId', 'fullName email avatar status');

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Check if user is a member
    const isMember = workspace.members.some(
      member => member.userId._id.toString() === userId.toString()
    );

    if (!isMember) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.status(200).json({ workspace });

  } catch (error) {
    console.error('Get workspace error:', error);
    res.status(500).json({ error: 'Failed to fetch workspace' });
  }
};

// Join workspace via invite code
exports.joinWorkspace = async (req, res) => {
  try {
    const { inviteCode } = req.body;
    const userId = req.user.id;

    const workspace = await Workspace.findOne({ inviteCode });

    if (!workspace) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }

    // Check if already a member
    const isMember = workspace.members.some(
      member => member.userId.toString() === userId
    );

    if (isMember) {
      return res.status(400).json({ error: 'Already a member of this workspace' });
    }

    // Add user to workspace
    workspace.members.push({
      userId: userId,
      role: 'member',
      joinedAt: new Date(),
    });

    await workspace.save();

    // Add workspace to user
    await User.findByIdAndUpdate(userId, {
      $push: { workspaces: workspace._id },
    });

    // Add user to all public channels
    const publicChannels = await Channel.find({
      workspaceId: workspace._id,
      isPrivate: false,
    });

    for (let channel of publicChannels) {
      if (!channel.members.includes(userId)) {
        channel.members.push(userId);
        await channel.save();
      }
    }

    res.status(200).json({
      message: 'Successfully joined workspace',
      workspace,
    });

  } catch (error) {
    console.error('Join workspace error:', error);
    res.status(500).json({ error: 'Failed to join workspace' });
  }
};

// Update workspace
exports.updateWorkspace = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { name, description, icon } = req.body;
    const userId = req.user.id;

    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Check if user is owner or admin
    const member = workspace.members.find(
      m => m.userId.toString() === userId.toString()
    );

    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // Update fields
    if (name) workspace.name = name;
    if (description !== undefined) workspace.description = description;
    if (icon !== undefined) workspace.icon = icon;

    await workspace.save();

    res.status(200).json({
      message: 'Workspace updated successfully',
      workspace,
    });

  } catch (error) {
    console.error('Update workspace error:', error);
    res.status(500).json({ error: 'Failed to update workspace' });
  }
};

// Get workspace members
exports.getWorkspaceMembers = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.id;

    const workspace = await Workspace.findById(workspaceId)
      .populate('members.userId', 'fullName email avatar status lastSeen');

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Check if user is a member
    const isMember = workspace.members.some(
      member => member.userId._id.toString() === userId.toString()
    );

    if (!isMember) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.status(200).json({ members: workspace.members });

  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
};

// Switch current workspace
exports.switchWorkspace = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.id;

    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Check if user is a member
    const isMember = workspace.members.some(
      member => member.userId.toString() === userId.toString()
    );

    if (!isMember) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update user's current workspace
    await User.findByIdAndUpdate(userId, {
      currentWorkspace: workspaceId,
    });

    res.status(200).json({
      message: 'Workspace switched successfully',
      workspaceId,
    });

  } catch (error) {
    console.error('Switch workspace error:', error);
    res.status(500).json({ error: 'Failed to switch workspace' });
  }
};