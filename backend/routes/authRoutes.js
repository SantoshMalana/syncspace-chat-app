const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
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

// ========================================
// GOOGLE OAUTH ROUTES
// ========================================

// @route   GET /api/auth/google
// @desc    Initiate Google OAuth
router.get('/google',
  (req, res, next) => {
    console.log(`🔐 Google OAuth initiated from: ${process.env.CLIENT_URL}`);
    next();
  },
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    session: false 
  })
);

// @route   GET /api/auth/google/callback
// @desc    Google OAuth callback
router.get('/google/callback',
  passport.authenticate('google', { 
    failureRedirect: `${process.env.CLIENT_URL}/login?error=google_auth_failed`,
    session: false 
  }),
  async (req, res) => {
    try {
      console.log(`✅ Google OAuth callback received for user: ${req.user.email}`);
      
      // Generate JWT token
      const token = generateToken(req.user._id);

      // Update user status to online
      await User.findByIdAndUpdate(req.user._id, {
        status: 'online',
        lastSeen: new Date(),
      });

      // Populate user data
      const user = await User.findById(req.user._id)
        .select('-password')
        .populate('workspaces')
        .populate('currentWorkspace');

      // Build redirect URL
      const successUrl = new URL(`${process.env.CLIENT_URL}/auth/google/success`);
      successUrl.searchParams.append('token', token);
      successUrl.searchParams.append('user', JSON.stringify({
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        avatar: user.avatar,
        status: user.status,
        statusMessage: user.statusMessage,
        workspaces: user.workspaces,
        currentWorkspace: user.currentWorkspace,
      }));

      console.log(`🎯 Redirecting to: ${successUrl.toString().split('user=')[0]}...`);
      res.redirect(successUrl.toString());
    } catch (error) {
      console.error('❌ Google OAuth callback error:', error);
      res.redirect(`${process.env.CLIENT_URL}/login?error=auth_failed&message=${encodeURIComponent(error.message)}`);
    }
  }
);

// ========================================
// REGULAR AUTH ROUTES (EXISTING)
// ========================================

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

// Update user profile with restrictions
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { fullName, avatar, statusMessage, status, timezone } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check name change restriction (1 time per 15 days)
    if (fullName && fullName !== user.fullName) {
      if (user.lastNameChangeDate) {
        const daysSinceChange = Math.floor((new Date() - user.lastNameChangeDate) / (1000 * 60 * 60 * 24));
        if (daysSinceChange < 15) {
          return res.status(400).json({ 
            error: `You can change your name again in ${15 - daysSinceChange} days`,
            daysRemaining: 15 - daysSinceChange
          });
        }
      }
      user.fullName = fullName;
      user.lastNameChangeDate = new Date();
    }

    // Check avatar change restriction (3 times per month)
    if (avatar && avatar !== user.avatar) {
      const currentMonthYear = new Date().toISOString().slice(0, 7); // YYYY-MM
      
      // Check if it's a new month
      if (user.lastAvatarChangeMonthYear !== currentMonthYear) {
        user.avatarChangesThisMonth = 0;
        user.lastAvatarChangeMonthYear = currentMonthYear;
      }

      if (user.avatarChangesThisMonth >= 3) {
        return res.status(400).json({ 
          error: 'You can change your avatar 3 times per month. Please try again next month.',
          changesThisMonth: 3,
          resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString()
        });
      }

      user.avatar = avatar;
      user.avatarChangesThisMonth += 1;
    }

    // Allow these updates without restrictions
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
        lastNameChangeDate: user.lastNameChangeDate,
        avatarChangesThisMonth: user.avatarChangesThisMonth,
      },
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get profile update status (to show restrictions UI)
router.get('/profile/restrictions', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentMonthYear = new Date().toISOString().slice(0, 7);
    let daysUntilNameChange = 0;
    
    if (user.lastNameChangeDate) {
      const daysSinceChange = Math.floor((new Date() - user.lastNameChangeDate) / (1000 * 60 * 60 * 24));
      daysUntilNameChange = Math.max(0, 15 - daysSinceChange);
    }

    const avatarChangesRemaining = 3 - (user.lastAvatarChangeMonthYear === currentMonthYear ? user.avatarChangesThisMonth : 0);

    res.status(200).json({
      canChangeName: daysUntilNameChange === 0,
      daysUntilNameChange,
      avatarChangesRemaining,
      totalAvatarChanges: 3,
    });

  } catch (error) {
    console.error('Get profile restrictions error:', error);
    res.status(500).json({ error: 'Failed to fetch restrictions' });
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