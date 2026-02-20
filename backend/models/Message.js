const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  content: {
    type: String,
    default: '',
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  channelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel',
  },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
  },
  messageType: {
    type: String,
    enum: ['channel', 'direct'],
    required: true,
  },
  attachments: [{
    filename: String,
    url: String,
    fileType: String,
    fileSize: Number,
  }],
  reactions: [{
    emoji: String,
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    }
  }],
  threadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
  },
  replyCount: {
    type: Number,
    default: 0,
  },
  isEdited: {
    type: Boolean,
    default: false,
  },
  editedAt: {
    type: Date,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  readBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    readAt: {
      type: Date,
      default: Date.now,
    }
  }],
  reports: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reason: String,
    reportedAt: {
      type: Date,
      default: Date.now,
    }
  }],
}, {
  timestamps: true,
});

// Indexes for faster queries
messageSchema.index({ channelId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, recipientId: 1, createdAt: -1 });
messageSchema.index({ workspaceId: 1, createdAt: -1 });
messageSchema.index({ threadId: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);