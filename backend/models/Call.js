const mongoose = require('mongoose');

const callSchema = new mongoose.Schema({
  caller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  callType: {
    type: String,
    enum: ['voice', 'video'],
    required: true
  },
  status: {
    type: String,
    enum: ['ringing', 'ongoing', 'ended', 'missed', 'declined'],
    default: 'ringing'
  },
  startTime: {
    type: Date
  },
  endTime: {
    type: Date
  },
  duration: {
    type: Number, // in seconds
    default: 0
  },
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: false  // Optional — DM calls don't belong to a workspace
  }
}, {
  timestamps: true
});

// Indexes for faster queries
callSchema.index({ caller: 1, createdAt: -1 });
callSchema.index({ receiver: 1, createdAt: -1 });
callSchema.index({ workspace: 1 });
callSchema.index({ status: 1 });

// Virtual to calculate duration if not set
callSchema.virtual('calculatedDuration').get(function () {
  if (this.duration > 0) return this.duration;
  if (this.startTime && this.endTime) {
    return Math.floor((this.endTime - this.startTime) / 1000);
  }
  return 0;
});

// Method to check if call involves user
callSchema.methods.involvesUser = function (userId) {
  return this.caller.toString() === userId.toString() ||
    this.receiver.toString() === userId.toString();
};

// Method to get the other participant
callSchema.methods.getOtherParticipant = function (userId) {
  return this.caller.toString() === userId.toString() ? this.receiver : this.caller;
};

module.exports = mongoose.model('Call', callSchema);