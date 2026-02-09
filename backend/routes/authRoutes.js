const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Workspace = require('../models/Workspace');
const Channel = require('../models/Channel');
const { authenticate } = require('../middleware/authMiddleware');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// Signup
router.post('/signup', async (req, res) => {
  try {
    const { fullName, email, password, workspaceName } = req.body;

    // Validate input
    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      fullName,
      email,
      password: hashedPassword,
    });

    await user.save();

    // If workspace name provided, create workspace
    if (workspaceName) {
      const slug = workspaceName.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
      
      const workspace = new Workspace({
        name: workspaceName,
        slug,
        ownerId: user._id,
        members: [{
          userId: user._id,
          role: 'owner',
          joinedAt: new Date(),
        }],
        inviteCode: Math.random().toString(36).substring(2, 10).toUpperCase(),
      });

      await workspace.save();

      // Create default "general" channel
      const generalChannel = new Channel({
        name: 'general',
        description: 'Default channel for workspace-wide communication',
        workspaceId: workspace._id,
        isPrivate: false,
        members: [user._id],
        createdBy: user._id,
      });

      await generalChannel.save();

      workspace.channels.push(generalChannel._id);
      await workspace.save();

      // Update user with workspace
      user.workspaces.push(workspace._id);
      user.currentWorkspace = workspace._id;
      await user.save();
    }

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        avatar: user.avatar,
        status: user.status,
        workspaces: user.workspaces,
        currentWorkspace: user.currentWorkspace,
      },
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await User.findOne({ email }).populate('workspaces');
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update user status to online
    user.status = 'online';
    user.lastSeen = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        avatar: user.avatar,
        status: user.status,
        statusMessage: user.statusMessage,
        workspaces: user.workspaces,
        currentWorkspace: user.currentWorkspace,
      },
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('workspaces')
      .populate('currentWorkspace');

    res.status(200).json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Update user profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { fullName, avatar, statusMessage, status, timezone } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);

    if (fullName) user.fullName = fullName;
    if (avatar !== undefined) user.avatar = avatar;
    if (statusMessage !== undefined) user.statusMessage = statusMessage;
    if (status) user.status = status;
    if (timezone) user.timezone = timezone;

    await user.save();

    res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        avatar: user.avatar,
        status: user.status,
        statusMessage: user.statusMessage,
        timezone: user.timezone,
      },
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Logout
router.post('/logout', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;

    // Update user status to offline
    await User.findByIdAndUpdate(userId, {
      status: 'offline',
      lastSeen: new Date(),
    });

    res.status(200).json({ message: 'Logout successful' });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

module.exports = router;