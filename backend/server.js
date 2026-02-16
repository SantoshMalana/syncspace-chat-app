const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const rateLimit = require('express-rate-limit');
const passport = require('passport');
const session = require('express-session');

// Load environment variables
dotenv.config();

// ⭐ Initialize Passport Config
require('./config/passport');

// Validate required environment variables
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET', 'CLIENT_URL', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_CALLBACK_URL'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error('❌ CRITICAL: Missing required environment variables:', missingEnvVars.join(', '));
  console.error('Please check your .env file and ensure ALL required variables are set.');
  console.error('\n📋 Required variables:');
  console.error('  - MONGO_URI (MongoDB connection string)');
  console.error('  - JWT_SECRET (JWT signing key)');
  console.error('  - CLIENT_URL (Frontend URL)');
  console.error('  - GOOGLE_CLIENT_ID (from Google Cloud Console)');
  console.error('  - GOOGLE_CLIENT_SECRET (from Google Cloud Console)');
  console.error('  - GOOGLE_CALLBACK_URL (OAuth callback URL)');
  process.exit(1);
}

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
        'http://localhost:5174',
        'http://localhost:3000'
      ];
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log('❌ Blocked Socket.io origin:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
});

// Middleware
// CORS Configuration
const allowedOrigins = [
  process.env.CLIENT_URL,
  'https://syncspace-realtime-collaboration-pl.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('❌ Blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}));

// Handle preflight requests
app.options('*', cors());

// Parse JSON request bodies (CRITICAL: Must come before routes)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ⭐ Session middleware (required for Passport)
app.use(session({
  secret: process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // true in production
    httpOnly: true, // Prevent JavaScript access to session cookie
    sameSite: 'lax', // Protect against CSRF attacks
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// ⭐ Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch((err) => {
    console.error('❌ MongoDB Connection Error:', err.message);
    console.error('Please check your MONGO_URI in .env file');
  });

// Serve static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate limiting configuration
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per minute
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Routes
const authRoutes = require('./routes/authRoutes');
const workspaceRoutes = require('./routes/workspaceRoutes');
const channelRoutes = require('./routes/channelRoutes');
const messageRoutes = require('./routes/messageRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const fixRoutes = require('./routes/fixRoutes');
const userRoutes = require('./routes/userRoutes');
// ⭐ NEW: Call and Meeting routes
const meetingRoutes = require('./routes/meetingRoutes');
const callRoutes = require('./routes/callRoutes');

// Apply rate limiting
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);
app.use('/api', apiLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/fix', fixRoutes);
app.use('/api/users', userRoutes);
// ⭐ NEW: Call and Meeting routes
app.use('/api/meetings', meetingRoutes);
app.use('/api/calls', callRoutes);

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
      meetings: '/api/meetings',
      calls: '/api/calls',
    }
  });
});

// Socket.io connection handling
const User = require('./models/User');
const jwt = require('jsonwebtoken');
// ⭐ NEW: Import socket handlers
const callHandlers = require('./socket/callHandlers');
const meetingHandlers = require('./socket/meetingHandlers');

// Store online users
const onlineUsers = new Map(); // userId -> socketId

// Socket.io authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    
    // ⭐ NEW: Fetch user details and attach to socket for call/meeting handlers
    const user = await User.findById(decoded.id).select('name email avatar');
    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }
    
    socket.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      avatar: user.avatar
    };
    
    next();
  } catch (error) {
    console.error('Socket authentication error:', error.message);
    next(new Error('Authentication error: Invalid token'));
  }
});

io.on('connection', (socket) => {
  console.log('🔌 User connected:', socket.id, socket.user?.name);

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

  // ⭐ NEW: Join user's personal room for direct notifications (calls/meetings)
  if (socket.user) {
    socket.join(socket.user.id);
    console.log(`User ${socket.user.name} joined personal room: ${socket.user.id}`);
  }

  // ⭐ NEW: Initialize call handlers
  callHandlers(io, socket);

  // ⭐ NEW: Initialize meeting handlers
  meetingHandlers(io, socket);

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
  console.log(`❌ 404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  // Log error details
  console.error('❌ Server Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method
  });

  // Don't expose stack traces in production
  const errorResponse = {
    error: err.message || 'Internal server error',
    path: req.path
  };

  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }

  res.status(err.status || 500).json(errorResponse);
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Client URL: ${process.env.CLIENT_URL}`);
  console.log(`🔐 Google OAuth enabled`);
  console.log(`📛 Google Callback: ${process.env.GOOGLE_CALLBACK_URL}`);
  console.log(`⚡ Socket.io ready for connections`);
  console.log(`📞 Call & Meeting features enabled`);
  console.log(`${'='.repeat(60)}\n`);
});