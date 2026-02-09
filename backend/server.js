const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      const allowedOrigins = [
        process.env.CLIENT_URL || 'https://syncspace-realtime-collaboration-pl.vercel.app',
        'http://localhost:5173',
        'http://localhost:3000'
      ];
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  },
});

// Middleware
app.use(express.json());

// CORS Configuration
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      process.env.CLIENT_URL || 'https://syncspace-realtime-collaboration-pl.vercel.app',
      'http://localhost:5173',
      'http://localhost:3000'
    ];

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch((err) => {
    console.error('❌ MongoDB Connection Error:', err.message);
    console.error('Please check your MONGO_URI in .env file');
  });

// Serve static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const authRoutes = require('./routes/authRoutes');
const workspaceRoutes = require('./routes/workspaceRoutes');
const channelRoutes = require('./routes/channelRoutes');
const messageRoutes = require('./routes/messageRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/upload', uploadRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'SyncSpace Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      workspaces: '/api/workspaces',
      channels: '/api/channels',
      messages: '/api/messages',
    }
  });
});

// Socket.io connection handling
const User = require('./models/User');

// Store online users
const onlineUsers = new Map(); // userId -> socketId

io.on('connection', (socket) => {
  console.log('🔌 User connected:', socket.id);

  // User joins with their ID
  socket.on('user:online', async (userId) => {
    try {
      onlineUsers.set(userId, socket.id);
      socket.userId = userId;

      // Update user status in DB
      await User.findByIdAndUpdate(userId, {
        status: 'online',
        lastSeen: new Date(),
      });

      // Broadcast to all clients that user is online
      io.emit('user:status', { userId, status: 'online' });

      console.log(`✅ User ${userId} is now online`);
    } catch (error) {
      console.error('Error setting user online:', error);
    }
  });

  // User joins a workspace room
  socket.on('workspace:join', (workspaceId) => {
    socket.join(`workspace:${workspaceId}`);
    console.log(`User joined workspace: ${workspaceId}`);
  });

  // User joins a channel room
  socket.on('channel:join', (channelId) => {
    socket.join(`channel:${channelId}`);
    console.log(`User joined channel: ${channelId}`);
  });

  // User leaves a channel room
  socket.on('channel:leave', (channelId) => {
    socket.leave(`channel:${channelId}`);
    console.log(`User left channel: ${channelId}`);
  });

  // User joins a thread
  socket.on('thread:join', (threadId) => {
    socket.join(`thread:${threadId}`);
    console.log(`User joined thread: ${threadId}`);
  });

  // User leaves a thread
  socket.on('thread:leave', (threadId) => {
    socket.leave(`thread:${threadId}`);
    console.log(`User left thread: ${threadId}`);
  });

  // Typing indicator
  socket.on('typing:start', ({ channelId, userId, userName }) => {
    socket.to(`channel:${channelId}`).emit('typing:user', {
      channelId,
      userId,
      userName,
      isTyping: true,
    });
  });

  socket.on('typing:stop', ({ channelId, userId }) => {
    socket.to(`channel:${channelId}`).emit('typing:user', {
      channelId,
      userId,
      isTyping: false,
    });
  });

  // Send message to channel
  socket.on('message:send', (message) => {
    if (message.channelId) {
      io.to(`channel:${message.channelId}`).emit('message:new', message);
    } else if (message.recipientId) {
      // Direct message
      const recipientSocketId = onlineUsers.get(message.recipientId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('message:new', message);
      }
      // Also send to sender
      socket.emit('message:new', message);
    }
  });

  // Message edited
  socket.on('message:edit', (message) => {
    if (message.channelId) {
      io.to(`channel:${message.channelId}`).emit('message:updated', message);
    }
  });

  // Message deleted
  socket.on('message:delete', ({ messageId, channelId }) => {
    io.to(`channel:${channelId}`).emit('message:deleted', { messageId });
  });

  // Reaction added
  socket.on('reaction:add', ({ messageId, channelId, reaction }) => {
    io.to(`channel:${channelId}`).emit('reaction:updated', {
      messageId,
      reaction,
    });
  });

  // User disconnect
  socket.on('disconnect', async () => {
    try {
      if (socket.userId) {
        onlineUsers.delete(socket.userId);

        // Update user status in DB
        await User.findByIdAndUpdate(socket.userId, {
          status: 'offline',
          lastSeen: new Date(),
        });

        // Broadcast to all clients that user is offline
        io.emit('user:status', {
          userId: socket.userId,
          status: 'offline',
        });

        console.log(`❌ User ${socket.userId} is now offline`);
      }
    } catch (error) {
      console.error('Error setting user offline:', error);
    }

    console.log('🔌 User disconnected:', socket.id);
  });
});

// Make io accessible to routes
app.set('io', io);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Client URL: ${process.env.CLIENT_URL}`);
  console.log(`⚡ Socket.io ready for connections`);
});