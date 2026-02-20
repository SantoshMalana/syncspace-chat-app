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

dotenv.config();
require('./config/passport');

const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET', 'CLIENT_URL', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_CALLBACK_URL'];
const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingEnvVars.length > 0) {
  console.error('❌ Missing env vars:', missingEnvVars.join(', '));
  process.exit(1);
}

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);

// ── Socket.IO ────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_URL,
  'https://syncspace-realtime-collaboration-pl.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: (origin, cb) => (!origin || allowedOrigins.includes(origin)) ? cb(null, true) : cb(new Error('Not allowed')),
    credentials: true,
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  // Increase ping timeout so Render cold-start survivors don't drop immediately
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, cb) => (!origin || allowedOrigins.includes(origin)) ? cb(null, true) : cb(new Error('Not allowed')),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
}));
app.options('*', cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(session({
  secret: process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  },
}));
app.use(passport.initialize());
app.use(passport.session());

// ── MongoDB ──────────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB error:', err.message));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Rate limiting ────────────────────────────────────────────────────────────
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });
const apiLimiter = rateLimit({ windowMs: 1 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false });

// ── Routes ───────────────────────────────────────────────────────────────────
const authRoutes = require('./routes/authRoutes');
const workspaceRoutes = require('./routes/workspaceRoutes');
const channelRoutes = require('./routes/channelRoutes');
const messageRoutes = require('./routes/messageRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const fixRoutes = require('./routes/fixRoutes');
const userRoutes = require('./routes/userRoutes');
const meetingRoutes = require('./routes/meetingRoutes');
const callRoutes = require('./routes/callRoutes');
const screenShareHandlers = require('./socket/screenShareHandlers');

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
app.use('/api/meetings', meetingRoutes);
app.use('/api/calls', callRoutes);

// ── Health check (also acts as keep-alive target) ────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.status(200).json({ message: 'SyncSpace Backend API', version: '1.0.0' });
});

// ── Self keep-alive ping (prevents Render free tier cold starts) ─────────────
// Pings our own /health endpoint every 14 minutes
// Render sleeps after 15 min of inactivity — this keeps it awake
if (process.env.NODE_ENV === 'production') {
  const BACKEND_URL = process.env.BACKEND_URL || `https://syncspace-backend-tfcc.onrender.com`;
  setInterval(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/health`);
      console.log(`🏓 Keep-alive ping: ${res.status}`);
    } catch (err) {
      console.error('Keep-alive ping failed:', err.message);
    }
  }, 14 * 60 * 1000); // 14 minutes
  console.log('⏰ Keep-alive ping scheduled every 14 minutes');
}

// ── Socket.IO ────────────────────────────────────────────────────────────────
const User = require('./models/User');
const jwt = require('jsonwebtoken');
const callHandlers = require('./socket/callHandlers');
const meetingHandlers = require('./socket/meetingHandlers');
const groupCallHandlers = require('./socket/groupCallHandlers');

const onlineUsers = new Map(); // userId → socketId

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('No token'));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('fullName email avatar');
    if (!user) return next(new Error('User not found'));
    socket.userId = decoded.id;
    socket.user = {
      id: user._id.toString(),
      fullName: user.fullName,
      name: user.fullName,
      email: user.email,
      avatar: user.avatar,
    };
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  console.log('🔌 Connected:', socket.user?.name, socket.id);

  // Join personal room for direct events (calls, notifications)
  if (socket.user) {
    socket.join(socket.user.id);
  }

  socket.on('user:online', async (userId) => {
    try {
      onlineUsers.set(userId, socket.id);
      socket.userId = userId;
      await User.findByIdAndUpdate(userId, { status: 'online', lastSeen: new Date() });
      io.emit('user:status', { userId, status: 'online' });
    } catch (err) {
      console.error('user:online error:', err);
    }
  });

  // ── Read receipts ──────────────────────────────────────────────────────────
  // Emitted by client when messages become visible in viewport
  socket.on('message:read', async ({ messageIds, channelId, readBy }) => {
    try {
      const Message = require('./models/Message');
      if (!messageIds?.length) return;

      // Bulk update: add readBy entry to all messages at once
      await Message.updateMany(
        {
          _id: { $in: messageIds },
          'readBy.user': { $ne: readBy }, // don't double-add
        },
        {
          $addToSet: {
            readBy: { user: readBy, readAt: new Date() },
          },
        }
      );

      // Broadcast to channel so message sender sees ticks update live
      io.to(`channel:${channelId}`).emit('message:read:update', {
        messageIds,
        readBy,
        channelId,
      });
    } catch (err) {
      console.error('message:read error:', err);
    }
  });

  // ── Handlers ───────────────────────────────────────────────────────────────
  callHandlers(io, socket);
  meetingHandlers(io, socket);
  groupCallHandlers(io, socket);
  screenShareHandlers(io, socket);

  // ── Rooms ──────────────────────────────────────────────────────────────────
  socket.on('workspace:join', id => socket.join(`workspace:${id}`));
  socket.on('channel:join', id => socket.join(`channel:${id}`));
  socket.on('channel:leave', id => socket.leave(`channel:${id}`));
  socket.on('thread:join', id => socket.join(`thread:${id}`));
  socket.on('thread:leave', id => socket.leave(`thread:${id}`));

  socket.on('screenshare:chat', ({ roomId, text }) => {
    socket.to(`screenshare:${roomId}`).emit('screenshare:chat', {
      userId: socket.user.id, name: socket.user.fullName, text, time: Date.now(),
    });
  });

  // ── Messaging ──────────────────────────────────────────────────────────────
  socket.on('typing:start', ({ channelId, userId, userName }) => {
    socket.to(`channel:${channelId}`).emit('typing:user', { channelId, userId, userName, isTyping: true });
  });
  socket.on('typing:stop', ({ channelId, userId }) => {
    socket.to(`channel:${channelId}`).emit('typing:user', { channelId, userId, isTyping: false });
  });

  socket.on('message:send', (message) => {
    if (message.channelId) {
      io.to(`channel:${message.channelId}`).emit('message:new', message);
    } else if (message.recipientId) {
      const recipientSocket = onlineUsers.get(message.recipientId);
      if (recipientSocket) io.to(recipientSocket).emit('message:new', message);
      socket.emit('message:new', message);
    }
  });

  socket.on('message:edit', (message) => io.to(`channel:${message.channelId}`).emit('message:updated', message));
  socket.on('message:delete', ({ messageId, channelId }) => io.to(`channel:${channelId}`).emit('message:deleted', { messageId }));
  socket.on('reaction:add', ({ messageId, channelId, reaction }) => io.to(`channel:${channelId}`).emit('reaction:updated', { messageId, reaction }));

  // ── Disconnect ─────────────────────────────────────────────────────────────
  socket.on('disconnect', async () => {
    try {
      if (socket.userId) {
        onlineUsers.delete(socket.userId);
        await User.findByIdAndUpdate(socket.userId, { status: 'offline', lastSeen: new Date() });
        io.emit('user:status', { userId: socket.userId, status: 'offline' });
      }
    } catch (err) {
      console.error('disconnect error:', err);
    }
    console.log('🔌 Disconnected:', socket.id);
  });
});

app.set('io', io);

// ── Error handlers ───────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Route not found', path: req.path }));
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`🚀 Server on port ${PORT}`);
  console.log(`📍 Env: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Client: ${process.env.CLIENT_URL}`);
  console.log(`⚡ Socket.IO ready`);
  console.log(`${'='.repeat(50)}\n`);
});