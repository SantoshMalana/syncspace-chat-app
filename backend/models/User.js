const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  avatar: {
    type: String,
    default: "",
  },
  status: {
    type: String,
    enum: ['online', 'away', 'busy', 'offline'],
    default: 'offline',
  },
  statusMessage: {
    type: String,
    default: "",
  },
  workspaces: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
  }],
  currentWorkspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
  },
  lastSeen: {
    type: Date,
    default: Date.now,
  },
  timezone: {
    type: String,
    default: 'UTC',
  },
  // Profile update tracking
  lastNameChangeDate: {
    type: Date,
    default: null,
  },
  avatarChangesThisMonth: {
    type: Number,
    default: 0,
  },
  lastAvatarChangeMonthYear: {
    type: String,
    default: null,
  },
  // Channel specific preferences
  channelPreferences: {
    type: Map,
    of: new mongoose.Schema({
      muted: { type: Boolean, default: false },
      mutedUntil: { type: Date, default: null },
    }, { _id: false })
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model("User", userSchema);