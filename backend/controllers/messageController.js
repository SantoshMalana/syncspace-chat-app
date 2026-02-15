const Message = require('../models/Message');
const Channel = require('../models/Channel');
const DirectMessage = require('../models/DirectMessage');
const User = require('../models/User');

// Send message to channel
exports.sendChannelMessage = async (req, res) => {
  try {
    const { channelId, content, workspaceId, attachments, mentions, threadId } = req.body;
    const userId = req.user.id;

    // Verify channel exists and user is a member
    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    if (!channel.members.includes(userId)) {
      return res.status(403).json({ error: 'Not a member of this channel' });
    }

    // If replying to a thread, verify parent message exists
    if (threadId) {
      const parentMessage = await Message.findById(threadId);
      if (!parentMessage) {
        return res.status(404).json({ error: 'Parent message not found' });
      }

      // Increment reply count on parent message
      parentMessage.replyCount += 1;
      await parentMessage.save();
    }

    // Create message
    const message = new Message({
      content,
      senderId: userId,
      channelId,
      workspaceId: workspaceId || channel.workspaceId,
      messageType: 'channel',
      attachments: attachments || [],
      mentions: mentions || [],
      threadId: threadId || null,
    });

    await message.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('senderId', 'fullName email avatar status avatarFrame')
      .populate('mentions', 'fullName email');

    // Emit socket event for real-time message delivery
    const io = req.app.get('io');
    if (io) {
      if (threadId) {
        // Emit to thread room
        io.to(`thread:${threadId}`).emit('thread:reply', populatedMessage);
        // Also emit to channel to update reply count
        io.to(`channel:${channelId}`).emit('message:updated', {
          _id: threadId,
          replyCount: (await Message.findById(threadId)).replyCount
        });
      } else {
        // Regular channel message
        io.to(`channel:${channelId}`).emit('message:new', populatedMessage);
      }
    }

    res.status(201).json({
      message: 'Message sent successfully',
      data: populatedMessage,
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

// Get channel messages
exports.getChannelMessages = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { limit = 50, before } = req.query;
    const userId = req.user.id;

    // Verify access
    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    if (!channel.members.includes(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Build query
    let query = {
      channelId,
      isDeleted: false,
      threadId: null, // Only get top-level messages, not thread replies
    };

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .populate('senderId', 'fullName email avatar status avatarFrame')
      .populate('mentions', 'fullName email')
      .populate('readBy.userId', 'fullName avatar')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.status(200).json({ messages: messages.reverse() });

  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

// Send direct message
exports.sendDirectMessage = async (req, res) => {
  try {
    const { recipientId, content, workspaceId, attachments } = req.body;
    const senderId = req.user.id;

    if (senderId === recipientId) {
      return res.status(400).json({ error: 'Cannot send message to yourself' });
    }

    // Find or create DM conversation
    let dmConversation = await DirectMessage.findOne({
      workspaceId,
      participants: { $all: [senderId, recipientId] }
    });

    if (!dmConversation) {
      dmConversation = new DirectMessage({
        participants: [senderId, recipientId],
        workspaceId,
      });
      await dmConversation.save();
    }

    // Create message
    const message = new Message({
      content,
      senderId,
      recipientId,
      workspaceId,
      messageType: 'direct',
      attachments: attachments || [],
    });

    await message.save();

    // Update DM conversation
    dmConversation.lastMessage = message._id;
    dmConversation.lastMessageAt = new Date();

    // Update unread count for recipient
    const recipientUnread = dmConversation.unreadCount.find(
      u => u.userId.toString() === recipientId
    );
    if (recipientUnread) {
      recipientUnread.count += 1;
    } else {
      dmConversation.unreadCount.push({ userId: recipientId, count: 1 });
    }

    await dmConversation.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('senderId', 'fullName email avatar status avatarFrame')
      .populate('recipientId', 'fullName email avatar status avatarFrame');

    // Emit socket event for real-time message delivery
    const io = req.app.get('io');
    if (io) {
      // Emit to both sender and recipient (sender might be on a different device)
      io.emit('message:new', populatedMessage);
    }

    res.status(201).json({
      message: 'Message sent successfully',
      data: populatedMessage,
    });

  } catch (error) {
    console.error('Send DM error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

// Get direct messages
exports.getDirectMessages = async (req, res) => {
  try {
    const { userId: otherUserId } = req.params;
    const { workspaceId, limit = 50, before } = req.query;
    const userId = req.user.id;

    // Build query
    let query = {
      workspaceId,
      messageType: 'direct',
      isDeleted: false,
      $or: [
        { senderId: userId, recipientId: otherUserId },
        { senderId: otherUserId, recipientId: userId }
      ]
    };

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .populate('senderId', 'fullName email avatar status avatarFrame')
      .populate('recipientId', 'fullName email avatar status avatarFrame')
      .populate('readBy.userId', 'fullName avatar')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    // Mark messages as read
    const dmConversation = await DirectMessage.findOne({
      workspaceId,
      participants: { $all: [userId, otherUserId] }
    });

    if (dmConversation) {
      const userUnread = dmConversation.unreadCount.find(
        u => u.userId.toString() === userId
      );
      if (userUnread) {
        userUnread.count = 0;
        await dmConversation.save();
      }
    }

    res.status(200).json({ messages: messages.reverse() });

  } catch (error) {
    console.error('Get DMs error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

// Get user's DM conversations
exports.getUserConversations = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.id;

    const conversations = await DirectMessage.find({
      workspaceId,
      participants: userId,
    })
      .populate('participants', 'fullName email avatar status')
      .populate('lastMessage')
      .sort({ lastMessageAt: -1 });

    res.status(200).json({ conversations });

  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
};

// Edit message
exports.editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.senderId.toString() !== userId) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    message.content = content;
    message.isEdited = true;
    message.editedAt = new Date();

    await message.save();

    const updatedMessage = await Message.findById(messageId)
      .populate('senderId', 'fullName email avatar status');

    // Emit socket event for real-time update
    const io = req.app.get('io');
    if (io && message.channelId) {
      io.to(`channel:${message.channelId}`).emit('message:updated', updatedMessage);
    }

    res.status(200).json({
      message: 'Message updated successfully',
      data: updatedMessage,
    });

  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({ error: 'Failed to edit message' });
  }
};

// Delete message
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.senderId.toString() !== userId) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    message.isDeleted = true;
    message.content = '[Message deleted]';
    await message.save();

    // Emit socket event for real-time deletion
    const io = req.app.get('io');
    if (io && message.channelId) {
      io.to(`channel:${message.channelId}`).emit('message:deleted', { messageId });
    }

    res.status(200).json({ message: 'Message deleted successfully' });

  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
};

// Add reaction to message
exports.addReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user.id;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if user already reacted with this emoji
    const existingReaction = message.reactions.find(
      r => r.userId.toString() === userId && r.emoji === emoji
    );

    if (existingReaction) {
      // Remove reaction
      message.reactions = message.reactions.filter(
        r => !(r.userId.toString() === userId && r.emoji === emoji)
      );
    } else {
      // Add reaction
      message.reactions.push({
        emoji,
        userId,
        createdAt: new Date(),
      });
    }

    await message.save();

    const updatedMessage = await Message.findById(messageId)
      .populate('senderId', 'fullName email avatar status')
      .populate('reactions.userId', 'fullName');

    // Emit socket event for real-time reaction update
    const io = req.app.get('io');
    if (io && message.channelId) {
      io.to(`channel:${message.channelId}`).emit('reaction:updated', {
        messageId,
        reaction: updatedMessage.reactions,
      });
    }

    res.status(200).json({
      message: 'Reaction updated',
      data: updatedMessage,
    });

  } catch (error) {
    console.error('Add reaction error:', error);
    res.status(500).json({ error: 'Failed to add reaction' });
  }
};

// Mark message as read
exports.markAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if already read
    const alreadyRead = message.readBy.some(r => r.userId.toString() === userId);

    if (!alreadyRead) {
      message.readBy.push({
        userId,
        readAt: new Date()
      });
      await message.save();

      // Emit socket event
      const io = req.app.get('io');
      if (io) {
        // Emit to channel or DM participants
        const room = message.channelId
          ? `channel:${message.channelId}`
          : `direct:${message.recipientId}`; // This might need refinement for DMs

        io.to(room).emit('message:read', {
          messageId,
          userId,
          readAt: new Date()
        });

        // Also emit to sender specifically for DMs if possible
        // For now, client side will handle the update
      }
    }

    res.status(200).json({ success: true });

  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
};

// Report message
exports.reportMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    message.reports.push({
      userId,
      reason,
    });

    await message.save();

    res.status(200).json({ message: 'Message reported successfully' });

  } catch (error) {
    console.error('Report message error:', error);
    res.status(500).json({ error: 'Failed to report message' });
  }
};

// Mark message as read
exports.markAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if already read
    const alreadyRead = message.readBy.some(r => r.userId.toString() === userId);

    if (!alreadyRead) {
      message.readBy.push({
        userId,
        readAt: new Date()
      });
      await message.save();

      // Emit socket event
      const io = req.app.get('io');
      if (io) {
        const room = message.channelId
          ? `channel:${message.channelId}`
          : `direct:${message.recipientId}`;

        io.to(room).emit('message:read', {
          messageId,
          userId,
          readAt: new Date()
        });
      }
    }

    res.status(200).json({ success: true });

  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
};

// Report message
exports.reportMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    message.reports.push({
      userId,
      reason,
    });

    await message.save();

    res.status(200).json({ message: 'Message reported successfully' });

  } catch (error) {
    console.error('Report message error:', error);
    res.status(500).json({ error: 'Failed to report message' });
  }
};

// Get thread replies
exports.getThreadReplies = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { limit = 50 } = req.query;
    const userId = req.user.id;

    // Verify parent message exists
    const parentMessage = await Message.findById(messageId)
      .populate('senderId', 'fullName email avatar status avatarFrame') // Added avatarFrame
      .populate('mentions', 'fullName email');

    if (!parentMessage) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Verify user has access to the channel
    if (parentMessage.channelId) {
      const channel = await Channel.findById(parentMessage.channelId);
      if (!channel || !channel.members.includes(userId)) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Get thread replies
    const replies = await Message.find({
      threadId: messageId,
      isDeleted: false,
    })
      .populate('senderId', 'fullName email avatar status avatarFrame') // Added avatarFrame
      .populate('mentions', 'fullName email')
      .sort({ createdAt: 1 })
      .limit(parseInt(limit));

    res.status(200).json({
      parentMessage,
      replies,
      totalReplies: parentMessage.replyCount,
    });

  } catch (error) {
    console.error('Get thread replies error:', error);
    res.status(500).json({ error: 'Failed to fetch thread replies' });
  }
};