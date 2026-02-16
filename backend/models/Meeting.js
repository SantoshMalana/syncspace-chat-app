const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true
  },
  channel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel',
    required: true
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  scheduledFor: {
    type: Date,
    required: true
  },
  duration: {
    type: Number, // in minutes
    default: 60
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['invited', 'accepted', 'declined', 'joined', 'left'],
      default: 'invited'
    },
    joinedAt: Date,
    leftAt: Date
  }],
  meetingType: {
    type: String,
    enum: ['video', 'audio'],
    default: 'video'
  },
  status: {
    type: String,
    enum: ['scheduled', 'ongoing', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  meetingLink: {
    type: String,
    unique: true,
    required: true
  },
  maxParticipants: {
    type: Number,
    default: 4
  },
  recordingEnabled: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for faster queries
meetingSchema.index({ workspace: 1, scheduledFor: 1 });
meetingSchema.index({ 'participants.user': 1 });
meetingSchema.index({ status: 1 });

// Virtual for checking if meeting is active
meetingSchema.virtual('isActive').get(function() {
  return this.status === 'ongoing';
});

// Method to check if user is participant
meetingSchema.methods.isParticipant = function(userId) {
  return this.participants.some(p => p.user.toString() === userId.toString());
};

// Method to check if user is creator
meetingSchema.methods.isCreator = function(userId) {
  return this.creator.toString() === userId.toString();
};

module.exports = mongoose.model('Meeting', meetingSchema);