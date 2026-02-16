const mongoose = require('mongoose');

const callNotificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['call', 'meeting'],
    required: true
  },
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'type'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  read: {
    type: Boolean,
    default: false
  },
  message: {
    type: String,
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes for faster queries
callNotificationSchema.index({ user: 1, read: 1, createdAt: -1 });
callNotificationSchema.index({ relatedId: 1 });

// Auto-delete notifications older than 30 days
callNotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

// Method to mark as read
callNotificationSchema.methods.markAsRead = function() {
  this.read = true;
  return this.save();
};

// Static method to create notification
callNotificationSchema.statics.createNotification = async function(data) {
  const notification = new this(data);
  await notification.save();
  return notification;
};

// Static method to get unread count
callNotificationSchema.statics.getUnreadCount = async function(userId) {
  return this.countDocuments({ user: userId, read: false });
};

module.exports = mongoose.model('CallNotification', callNotificationSchema);