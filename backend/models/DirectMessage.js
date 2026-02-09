const mongoose = require('mongoose');

const directMessageSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }],
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
  },
  lastMessageAt: {
    type: Date,
    default: Date.now,
  },
  unreadCount: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    count: {
      type: Number,
      default: 0,
    }
  }],
}, {
  timestamps: true,
});

// Ensure only 2 participants per DM
directMessageSchema.pre('save', function(next) {
  if (this.participants.length !== 2) {
    next(new Error('Direct message must have exactly 2 participants'));
  } else {
    next();
  }
});

// Index for faster queries
directMessageSchema.index({ participants: 1, workspaceId: 1 });

module.exports = mongoose.model('DirectMessage', directMessageSchema);