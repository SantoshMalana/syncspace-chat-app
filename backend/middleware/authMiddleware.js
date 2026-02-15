const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No token provided');
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      console.log('❌ User not found for token');
      return res.status(401).json({ error: 'User not found' });
    }

    // Attach user to request with CONSISTENT STRING ID
    // This ensures all comparisons work correctly
    req.user = {
      ...user.toObject(),
      id: user._id.toString(), // Always a string for comparisons
      _id: user._id // Keep ObjectId for mongoose operations
    };

    console.log('✅ User authenticated:', user.fullName, req.user.id);
    next();

  } catch (error) {
    console.error('❌ Auth middleware error:', error.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};