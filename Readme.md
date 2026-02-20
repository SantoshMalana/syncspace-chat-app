# SyncSpace — Real-Time Collaboration Platform

A full-stack real-time collaboration platform built with React, Node.js, Socket.IO, and WebRTC. Features include messaging, voice/video calls, group calls, screen sharing, file sharing, and meeting scheduling.

---

## 🚀 Live URLs

| Service | URL |
|---------|-----|
| Frontend | https://syncspace-realtime-collaboration-pl.vercel.app |
| Backend | https://syncspace-backend-tfcc.onrender.com |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, TailwindCSS |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas (Mongoose) |
| Real-time | Socket.IO v4 |
| WebRTC | Native WebRTC API (peer-to-peer calls) |
| TURN Server | Metered.ca (syncspaceapplication.metered.live) |
| File Storage | Cloudinary |
| Auth | JWT + Google OAuth 2.0 (Passport.js) |
| Deployment | Vercel (frontend) + Render (backend) |

---

## ✨ Features

### Messaging
- Real-time channel messaging via Socket.IO
- Direct messages between users
- Message editing and deletion
- Emoji reactions
- Thread replies
- File and image sharing (Cloudinary)
- Read receipts with double tick indicators
- Typing indicators

### Voice & Video Calls (1-on-1)
- Voice calls between users
- Video calls with camera toggle
- Screen sharing during calls
- Mute/unmute controls
- Call duration timer
- Incoming call notifications
- Busy/decline handling

### Group Calls
- Multi-participant voice/video calls in channels
- Mesh WebRTC topology (peer-to-peer between all participants)
- Screen sharing in group calls
- Join active group calls
- Participant grid view

### Screen Share Rooms (Option B)
- Dedicated screen share sessions in channels
- Host starts session → workspace members see "Join Session" badge
- Full-screen viewer UI with live chat sidebar
- Real-time viewer count
- Multiple viewers supported
- Auto-cleanup on disconnect or browser stop button

### Workspaces & Channels
- Create and manage multiple workspaces
- Public and private channels
- Channel member management (add/remove/promote)
- Invite by email or user ID
- Role-based permissions (admin/member)

### Meeting Scheduler
- Schedule meetings with title, description, time
- Meeting notifications to workspace members
- Meeting history

### User Management
- JWT authentication
- Google OAuth login
- Profile management with avatar
- Online/offline status indicators
- Login alerts for new device sign-ins
- Channel notification preferences (mute/unmute)

---

## 📁 Project Structure

```
SyncSpace/
├── frontend/                  # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/        # UI components
│   │   │   ├── calls/         # Call UI (CallManager, IncomingCall, etc.)
│   │   │   ├── screenshare/   # ScreenShareRoom component
│   │   │   ├── ChannelHeader.tsx
│   │   │   └── ...
│   │   ├── context/           # React contexts
│   │   │   ├── CallContext.tsx
│   │   │   ├── GroupCallContext.tsx
│   │   │   └── ScreenShareContext.tsx
│   │   ├── hooks/             # Custom hooks
│   │   │   ├── useCall.ts         # 1-on-1 call logic + WebRTC
│   │   │   ├── useGroupCall.ts    # Group call logic + WebRTC
│   │   │   └── useScreenShare.ts  # Screen share room logic
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   └── DashboardWrapper.tsx
│   │   ├── utils/
│   │   │   ├── api.ts         # All API calls
│   │   │   └── socket.ts      # Socket.IO client
│   │   └── types/
│   │       └── call.types.ts
│   ├── .env                   # Local env vars
│   ├── .env.production        # Production env vars
│   └── vercel.json            # Vercel SPA routing config
│
└── backend/                   # Node.js + Express
    ├── config/
    │   ├── multer.js          # Cloudinary file upload config
    │   └── passport.js        # Google OAuth config
    ├── controllers/
    │   ├── messageController.js
    │   ├── authController.js
    │   └── ...
    ├── middleware/
    │   └── authMiddleware.js
    ├── models/
    │   ├── User.js
    │   ├── Message.js
    │   ├── Channel.js
    │   ├── Workspace.js
    │   └── Call.js
    ├── routes/
    │   ├── authRoutes.js
    │   ├── messageRoutes.js
    │   ├── uploadRoutes.js
    │   └── ...
    ├── socket/
    │   ├── callHandlers.js        # 1-on-1 call socket events
    │   ├── groupCallHandlers.js   # Group call socket events
    │   ├── meetingHandlers.js     # Meeting socket events
    │   └── screenShareHandlers.js # Screen share room events
    └── server.js                  # Main entry point
```

---

## ⚙️ Environment Variables

### Backend (Render Dashboard)

| Variable | Description |
|----------|-------------|
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret key for JWT tokens |
| `CLIENT_URL` | Frontend URL (Vercel) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_CALLBACK_URL` | `https://your-backend.onrender.com/api/auth/google/callback` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `NODE_ENV` | `production` |
| `BACKEND_URL` | Backend URL (for keep-alive ping) |
| `PORT` | `5000` |

### Frontend (Vercel Dashboard)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend URL |
| `VITE_SOCKET_URL` | Backend URL (for Socket.IO) |
| `VITE_METERED_API_KEY` | Metered TURN server credential |

---

## 🔧 Local Development Setup

### Prerequisites
- Node.js >= 18
- MongoDB Atlas account
- Cloudinary account
- Google Cloud Console project (OAuth)

### Backend Setup
```bash
cd backend
npm install
```

Create `backend/.env`:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost:5173
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

```bash
npm start
```

### Frontend Setup
```bash
cd frontend
npm install
```

Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
VITE_METERED_API_KEY=your_metered_key
```

```bash
npm run dev
```

---

## 🌐 Deployment

### Backend → Render
1. Connect GitHub repo to Render
2. Set **Build Command**: `npm install`
3. Set **Start Command**: `node server.js`
4. Add all backend env vars in Render dashboard
5. Auto-deploy on push is enabled

### Frontend → Vercel
1. Connect GitHub repo to Vercel
2. Set **Framework**: Vite
3. Set **Build Command**: `tsc && vite build`
4. Set **Output Directory**: `dist`
5. Add all frontend env vars in Vercel dashboard
6. `vercel.json` handles SPA routing

### Google OAuth (Required for production)
In Google Cloud Console → APIs & Services → Credentials → your OAuth client:
- **Authorised JavaScript origins**: Add your Vercel URL and Render URL
- **Authorised redirect URIs**: Add `https://your-backend.onrender.com/api/auth/google/callback`

### MongoDB Atlas
- Network Access → Add `0.0.0.0/0` to allow Render IP

---

## 📡 WebRTC Architecture

### TURN Server
All WebRTC calls use Metered.ca TURN server for NAT traversal across different networks/devices.

```
Domain: syncspaceapplication.metered.live
Ports: 80, 443 (TCP + UDP), 443 (TLS)
```

### 1-on-1 Calls
Simple peer-to-peer: Caller ↔ Receiver via single RTCPeerConnection.

### Group Calls
Mesh topology: Every participant maintains a direct RTCPeerConnection to every other participant.

### Screen Share Rooms
Host maintains one RTCPeerConnection per viewer (stored in Map). Viewers have a single connection to the host.

---

## 🔌 Socket.IO Events

### Calls
| Event | Direction | Description |
|-------|-----------|-------------|
| `call:initiate` | Client→Server | Start a call |
| `call:incoming` | Server→Client | Notify receiver |
| `call:accept` | Client→Server | Accept call |
| `call:decline` | Client→Server | Decline call |
| `call:end` | Client→Server | End call |
| `webrtc:offer` | Client→Server→Client | WebRTC offer relay |
| `webrtc:answer` | Client→Server→Client | WebRTC answer relay |
| `webrtc:ice-candidate` | Client→Server→Client | ICE candidate relay |

### Group Calls
| Event | Description |
|-------|-------------|
| `group-call:start` | Start group call in channel |
| `group-call:join` | Join active group call |
| `group-call:leave` | Leave group call |
| `group-call:offer/answer/ice` | WebRTC signaling |
| `group-call:peer-joined` | New participant joined |
| `group-call:peer-left` | Participant left |

### Screen Share Rooms
| Event | Description |
|-------|-------------|
| `screenshare:start` | Host starts session |
| `screenshare:join` | Viewer joins session |
| `screenshare:offer/answer/ice` | WebRTC signaling |
| `screenshare:end` | Host ends session |
| `screenshare:available` | Broadcast to workspace |
| `screenshare:chat` | Live chat in session |

---

## 📦 Key Dependencies

### Backend
| Package | Purpose |
|---------|---------|
| `express` | HTTP server |
| `socket.io` | Real-time events |
| `mongoose` | MongoDB ORM |
| `jsonwebtoken` | JWT auth |
| `passport` + `passport-google-oauth20` | Google OAuth |
| `cloudinary` + `multer-storage-cloudinary` | File uploads |
| `multer` | Multipart form handling |
| `bcryptjs` | Password hashing |
| `express-rate-limit` | Rate limiting |
| `nodemailer` | Email (login alerts) |

### Frontend
| Package | Purpose |
|---------|---------|
| `socket.io-client` | Real-time connection |
| `react-router-dom` | Routing |
| `emoji-picker-react` | Emoji picker |
| `date-fns` | Date formatting |
| `react-icons` | Icons |

---

## 🐛 Known Issues & Fixes Applied

| Issue | Fix |
|-------|-----|
| Cross-device calls failing | Added Metered TURN server credentials |
| File uploads lost on Render restart | Migrated to Cloudinary storage |
| Socket URL not resolving in production | Added `VITE_SOCKET_URL` env var + updated socket.ts |
| File-only messages failing (content required) | Made `content` field optional in Message model |
| Rate limiter trust proxy error on Render | Added `app.set('trust proxy', 1)` |
| WebRTC black screen on video | Fixed srcObject assignment timing in video elements |
| Duplicate messages on reconnect | Fixed socket event listener cleanup |
| Screen share auto-stop not working | Added `onended` handler on video track |

---

## 📝 License

MIT