import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { workspaceAPI, channelAPI, messageAPI, uploadAPI } from '../utils/api';
import { initializeSocket, joinWorkspace, joinChannel, leaveChannel, sendTypingStart, sendTypingStop, disconnectSocket, joinThread, leaveThread, getSocket } from '../utils/socket';
import type { Workspace, Channel, Message, User, TypingUser } from '../types';
import MessageItem from '../components/MessageItem';
import ThreadPanel from '../components/ThreadPanel';
import FileUpload from '../components/FileUpload';
import EmojiPickerComponent from '../components/EmojiPickerComponent';
import MentionAutocomplete from '../components/MentionAutocomplete';
import ProfilePanel from '../components/ProfilePanel';
import ChannelSettings from '../components/ChannelSettings';
import InviteMembers from '../components/InviteMembers';
import ChannelContextMenu from '../components/ChannelContextMenu';
import NotificationPreferences from '../components/NotificationPreferences';
import { useCallContext } from '../context/CallContext';
import { useGroupCallContext } from '../context/GroupCallContext';
import ChannelDetailsMenu from '../components/ChannelDetailsMenu';
import AddPeopleModal from '../components/AddPeopleModal';
import WorkspaceMenu from '../components/WorkspaceMenu';
import ChannelHeader from '../components/ChannelHeader';
import SearchModal from '../components/SearchModal';
import ChannelInfo from '../components/ChannelInfo';
import { BookmarksPanel } from '../components/BookmarksPanel';
import { MediaFilesPanel } from '../components/MediaFilesPanel';
// Meeting Components Imports
import { useMeetingContext } from '../context/MeetingContext';
import MeetingScheduler from '../components/meetings/MeetingScheduler';
import ScheduledMeetingsList from '../components/meetings/ScheduledMeetingsList';
import MeetingRoom from '../components/meetings/MeetingRoom';
import MeetingNotification from '../components/meetings/MeetingNotification';
import type { Meeting } from '../types/meeting.types';
import { useScreenShareContext } from '../context/ScreenShareContext';
import ScreenShareRoom from '../components/screenshare/ScreenShareRoom';

const Dashboard = () => {
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const socketListenersRegistered = useRef(false);
  const currentUserRef = useRef<User | null>(null);
  const activeChannelRef = useRef<Channel | null>(null);
  const activeDMUserRef = useRef<User | null>(null);

  // User state
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Workspace & Channel state
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);

  // Message state
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [bookmarkedMessages, setBookmarkedMessages] = useState<Set<string>>(new Set());
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showMediaFiles, setShowMediaFiles] = useState(false);

  // Unread tracking state
  const [unreadChannels, setUnreadChannels] = useState<Set<string>>(new Set());
  const [unreadDMs, setUnreadDMs] = useState<Map<string, number>>(new Map());

  // Toast notification state
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: 'success' | 'error' | 'info' }>>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [showCreateWorkspaceModal, setShowCreateWorkspaceModal] = useState(false);
  const [showJoinWorkspaceModal, setShowJoinWorkspaceModal] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [joinInviteCode, setJoinInviteCode] = useState('');

  // NEW: User search and invite states
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  // ============ CALL FUNCTIONALITY ============
  const {
    isCallActive,
    mediaError,
    initiateCall,
  } = useCallContext();

  // ============ GROUP CALL FUNCTIONALITY ============
  const {
    groupCall,
    startGroupCall,
  } = useGroupCallContext();

  // ============ SCREEN SHARE ============
  const {
    isHosting,
    isViewing,
    availableRooms,
    startRoom,
    joinRoom,
  } = useScreenShareContext();

  const [showScreenShareRoom, setShowScreenShareRoom] = useState(false);

  // ============ MEETING FUNCTIONALITY ============
  const {
    isInMeeting,
    joinMeeting,
    leaveMeeting,
  } = useMeetingContext();

  // Meeting UI state
  const [isSchedulerOpen, setIsSchedulerOpen] = useState(false);
  const [isMeetingsListOpen, setIsMeetingsListOpen] = useState(false);
  const [activeMeeting, setActiveMeeting] = useState<Meeting | null>(null);
  const [meetingNotificationsDisplay, setMeetingNotificationsDisplay] = useState<any[]>([]);

  // Advanced features state
  const [showThreadPanel, setShowThreadPanel] = useState(false);
  const [activeThread, setActiveThread] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [showChannelSettings, setShowChannelSettings] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [workspaceMembers, setWorkspaceMembers] = useState<User[]>([]);
  const [showDM, setShowDM] = useState(false);
  const [activeDMUser, setActiveDMUser] = useState<User | null>(null);
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const [activeProfileUser, setActiveProfileUser] = useState<User | null>(null);
  const [dmConversations, setDmConversations] = useState<any[]>([]);

  // New UI components state
  const [showChannelContextMenu, setShowChannelContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [contextMenuChannel, setContextMenuChannel] = useState<Channel | null>(null);
  const [showNotificationPrefs, setShowNotificationPrefs] = useState(false);
  const [showChannelDetailsMenu, setShowChannelDetailsMenu] = useState(false);
  const [showAddPeopleModal, setShowAddPeopleModal] = useState(false);
  const [showWorkspaceMenuModal, setShowWorkspaceMenuModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showChannelInfo, setShowChannelInfo] = useState(false);
  const [showKeybindsModal, setShowKeybindsModal] = useState(false);
  const [showScrollFAB, setShowScrollFAB] = useState(false);
  const [unreadBelowFold, setUnreadBelowFold] = useState(0);

  // Initialize on mount
  useEffect(() => {
    initializeApp();
    // ✅ FIX: Do NOT call disconnectSocket() here.
    // The socket lifecycle is owned by DashboardWrapper/CallProvider.
    // Destroying the socket on Dashboard unmount breaks the call system.
    // The socket is properly disconnected on logout via handleLogout().
    return () => { };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Cmd+K / Ctrl+K → open search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearchModal(true);
      }
      // Cmd+/ or Ctrl+/ for help (alternative)
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setShowKeybindsModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // ── Scroll-to-bottom FAB: show when user scrolls up > 300px from bottom ──
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const handleScroll = () => {
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollFAB(distFromBottom > 300);
      if (distFromBottom < 50) setUnreadBelowFold(0);
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [activeChannel, showDM]); // re-bind when view changes

  // ============ MEETING HANDLERS & LISTENERS ============
  const handleJoinMeeting = (meeting: Meeting) => {
    setActiveMeeting(meeting);
    setIsMeetingsListOpen(false);
    joinMeeting(meeting._id);
  };

  const handleLeaveMeeting = () => {
    if (activeMeeting) {
      leaveMeeting();
    }
    setActiveMeeting(null);
  };

  const handleOpenScheduler = () => {
    setIsSchedulerOpen(true);
  };

  const handleOpenMeetingsList = () => {
    setIsMeetingsListOpen(true);
  };

  // Meeting socket listeners removed (notifications not in MeetingContextType)

  const initializeApp = async () => {
    try {
      setError(null);
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');

      if (!token || !userStr) {
        console.log('❌ No token or user found, redirecting to login');
        navigate('/login');
        return;
      }

      const user = JSON.parse(userStr);
      setCurrentUser(user);

      console.log('🔄 Initializing SyncSpace...');
      console.log('👤 Current user:', user.fullName, user.id);

      // Initialize Socket.io
      const socket = initializeSocket(user.id);
      setupSocketListeners(socket);

      // Fetch workspaces
      const workspacesData: any = await workspaceAPI.getAll();
      console.log('✅ Workspaces loaded:', workspacesData.workspaces?.length || 0);

      if (!workspacesData.workspaces || workspacesData.workspaces.length === 0) {
        setWorkspaces([]);
        setShowCreateWorkspaceModal(true);
        setLoading(false);
        return;
      }

      setWorkspaces(workspacesData.workspaces);
      const firstWorkspace = workspacesData.workspaces[0];
      // ✅ FIX: Use _id || id to handle both MongoDB ObjectId formats
      const firstWorkspaceId = firstWorkspace._id || firstWorkspace.id;
      console.log('🏢 First workspace ID:', firstWorkspaceId, '| workspace:', firstWorkspace.name);

      setCurrentWorkspace(firstWorkspace);
      joinWorkspace(firstWorkspaceId);

      // Fetch workspace members
      await fetchWorkspaceMembers(firstWorkspaceId);

      // Fetch channels
      await fetchChannelsForWorkspace(firstWorkspaceId);

      // Fetch DM conversations
      await fetchDMConversations(firstWorkspaceId);

      setLoading(false);

    } catch (error: any) {
      console.error('❌ Error initializing app:', error);
      setError(error.message || 'Failed to initialize app');
      setLoading(false);
    }
  };

  const fetchWorkspaceMembers = async (workspaceId: string) => {
    try {
      if (!workspaceId) {
        console.warn('⚠️ fetchWorkspaceMembers called with no workspaceId, skipping');
        return;
      }
      console.log('📥 Fetching members for workspace:', workspaceId);
      const membersData: any = await workspaceAPI.getMembers(workspaceId);

      if (membersData && membersData.members && Array.isArray(membersData.members)) {
        const formattedMembers = membersData.members.map((m: any) => {
          if (typeof m.userId === 'object' && m.userId !== null) {
            return m.userId;
          }
          return { _id: m.userId, fullName: 'Unknown', email: '' };
        }).filter(Boolean);

        setWorkspaceMembers(formattedMembers);
      }
    } catch (error: any) {
      console.error('❌ Error fetching workspace members:', error);
      setWorkspaceMembers([]);
    }
  };

  const fetchChannelsForWorkspace = async (workspaceId: string) => {
    try {
      const channelsData: any = await channelAPI.getWorkspaceChannels(workspaceId);
      setChannels(channelsData.channels || []);

      if (channelsData.channels && channelsData.channels.length > 0) {
        const firstChannel = channelsData.channels[0];
        setActiveChannel(firstChannel);
        setShowDM(false);
        joinChannel(firstChannel._id);

        const messagesData: any = await messageAPI.getChannelMessages(firstChannel._id);
        setMessages(messagesData.messages || []);
        scrollToBottom();
      }
    } catch (error: any) {
      console.error('❌ Error fetching channels:', error);
      throw error;
    }
  };

  const fetchDMConversations = async (workspaceId: string) => {
    try {
      const conversationsData: any = await messageAPI.getUserConversations(workspaceId);
      setDmConversations(conversationsData.conversations || []);
    } catch (error) {
      console.error('❌ Error fetching DM conversations:', error);
    }
  };

  const handleCreateWorkspace = async () => {
    try {
      if (!newWorkspaceName.trim()) return;

      const response: any = await workspaceAPI.create(newWorkspaceName);
      const newWorkspace = response.workspace;

      setWorkspaces([...workspaces, newWorkspace]);
      setCurrentWorkspace(newWorkspace);
      setShowCreateWorkspaceModal(false);
      setNewWorkspaceName('');

      // ✅ FIX: Use _id || id to handle both MongoDB ObjectId formats
      const newWorkspaceId = newWorkspace._id || newWorkspace.id;
      await fetchWorkspaceMembers(newWorkspaceId);
      await fetchChannelsForWorkspace(newWorkspaceId);
      await fetchDMConversations(newWorkspaceId);

    } catch (error: any) {
      console.error('❌ Error creating workspace:', error);
      alert(error.message || 'Failed to create workspace');
    }
  };

  const handleJoinWorkspace = async () => {
    try {
      if (!joinInviteCode.trim()) return;

      const response: any = await workspaceAPI.join(joinInviteCode);
      const joinedWorkspace = response.workspace;

      if (!workspaces.find(w => w._id === joinedWorkspace._id)) {
        setWorkspaces([...workspaces, joinedWorkspace]);
      }

      await handleSwitchWorkspace(joinedWorkspace);
      setShowJoinWorkspaceModal(false);
      setJoinInviteCode('');

    } catch (error: any) {
      console.error('❌ Error joining workspace:', error);
      alert(error.message || 'Failed to join workspace');
    }
  };

  const handleSwitchWorkspace = async (workspace: Workspace) => {
    try {
      if (activeChannel) {
        leaveChannel(activeChannel._id);
      }

      // ✅ FIX: Use _id || id to handle both MongoDB ObjectId formats
      const workspaceId = workspace._id || (workspace as any).id;
      await workspaceAPI.switchWorkspace(workspaceId);
      setCurrentWorkspace(workspace);
      setShowWorkspaceMenu(false);
      setMessages([]);
      setActiveChannel(null);

      joinWorkspace(workspaceId);

      await fetchWorkspaceMembers(workspaceId);
      await fetchChannelsForWorkspace(workspaceId);
      await fetchDMConversations(workspaceId);

    } catch (error: any) {
      console.error('❌ Error switching workspace:', error);
      alert(error.message || 'Failed to switch workspace');
    }
  };

  const setupSocketListeners = (socket: any) => {
    if (socketListenersRegistered.current) return;
    socketListenersRegistered.current = true;

    socket.on('message:new', (message: Message) => {
      // Deduplicate — only add if not already in list
      setMessages(prev => {
        if (prev.some(m => m._id === message._id)) return prev;
        return [...prev, message];
      });

      // ✅ FIX: Read from refs, not stale closure values
      const senderIdStr = typeof message.senderId === 'object'
        ? message.senderId._id
        : message.senderId;

      const currentUserIdStr =
        currentUserRef.current?.id || currentUserRef.current?._id;

      const currentActiveChannel = activeChannelRef.current;
      const currentActiveDMUser = activeDMUserRef.current;

      if (senderIdStr !== currentUserIdStr) {

        // Channel unread
        if (message.channelId && message.channelId !== currentActiveChannel?._id) {
          setUnreadChannels(prev => new Set([...prev, message.channelId!]));
        }

        // DM unread
        if (message.messageType === 'direct' && senderIdStr) {
          const activeDMUserIdStr =
            currentActiveDMUser?._id || currentActiveDMUser?.id;

          if (senderIdStr !== activeDMUserIdStr) {
            setUnreadDMs(prev => {
              const newMap = new Map(prev);
              newMap.set(senderIdStr, (newMap.get(senderIdStr) || 0) + 1);
              return newMap;
            });
          }
        }
      }
    });


    socket.on('message:updated', (message: Message) => {
      setMessages(prev => prev.map(m => m._id === message._id ? message : m));
    });

    socket.on('message:deleted', ({ messageId }: { messageId: string }) => {
      setMessages(prev => prev.filter(m => m._id !== messageId));
    });

    socket.on('typing:user', (data: TypingUser) => {
      if (data.isTyping) {
        setTypingUsers(prev => {
          const exists = prev.find(u => u.userId === data.userId && u.channelId === data.channelId);
          if (exists) return prev;
          return [...prev, data];
        });
      } else {
        setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
      }
    });

    socket.on('user:status', ({ userId, status }: { userId: string; status: string }) => {
      setWorkspaceMembers(prev => prev.map(m =>
        (m._id === userId || m.id === userId) ? { ...m, status: status as 'online' | 'away' | 'busy' | 'offline' } : m
      ));
    });

    socket.on('thread:reply', (message: Message) => {
      if (showThreadPanel && activeThread?._id === message.threadId) {
        setMessages(prev => [...prev, message]);
      }
    });

    socket.on('reaction:updated', ({ messageId, reaction }: any) => {
      setMessages(prev => prev.map(m =>
        m._id === messageId ? { ...m, reactions: reaction } : m
      ));
    });

    socket.on('message:read', ({ messageId, userId, readAt }: { messageId: string, userId: string, readAt: string }) => {
      setMessages(prev => prev.map(msg => {
        if (msg._id === messageId) {
          const readBy = msg.readBy || [];
          if (!readBy.some(r => typeof r.userId === 'string' ? r.userId === userId : r.userId._id === userId)) {
            return {
              ...msg,
              readBy: [...readBy, { userId, readAt }]
            };
          }
        }
        return msg;
      }));
    });

    socket.on('message:read:update', ({ messageIds, readBy }: { messageIds: string[], readBy: string }) => {
      setMessages(prev => prev.map(m =>
        messageIds.includes(m._id)
          ? {
            ...m,
            readBy: [...(m.readBy || []), { userId: readBy, readAt: new Date().toISOString() }]
          }
          : m
      ));
    });
  };

  const selectChannel = async (channel: Channel) => {
    if (activeChannel) {
      leaveChannel(activeChannel._id);
    }

    setActiveChannel(channel);
    setActiveDMUser(null);
    setShowDM(false);
    setMessageInput('');
    joinChannel(channel._id);

    // Mark channel as read
    setUnreadChannels(prev => {
      const newSet = new Set(prev);
      newSet.delete(channel._id);
      return newSet;
    });

    try {
      const messagesData: any = await messageAPI.getChannelMessages(channel._id);
      setMessages(messagesData.messages || []);
      scrollToBottom();
    } catch (error) {
      console.error('❌ Error fetching messages:', error);
    }
  };

  const sendMessage = async () => {
    if ((!messageInput.trim() && selectedFiles.length === 0) || !currentWorkspace || !currentUser) return;
    if (!activeChannel && !activeDMUser) return;

    try {
      let attachments: any[] = [];
      if (selectedFiles.length > 0) {
        setUploading(true);
        const uploadResult = await uploadAPI.uploadMultiple(selectedFiles);
        attachments = uploadResult.files;
        setSelectedFiles([]);
        setUploading(false);
      }

      if (showDM && activeDMUser) {
        await messageAPI.sendDirectMessage({
          recipientId: activeDMUser._id || activeDMUser.id,
          content: messageInput,
          workspaceId: currentWorkspace._id,
          attachments,
        });
      } else if (activeChannel) {
        const mentionMatches = messageInput.match(/@[\w\s]+/g);
        const mentions = mentionMatches
          ? mentionMatches
            .map(m => m.substring(1).trim())
            .map(name => {
              const user = workspaceMembers.find(u => u.fullName.toLowerCase() === name.toLowerCase());
              return user?._id || user?.id;
            })
            .filter(Boolean)
          : [];

        await messageAPI.sendChannelMessage({
          channelId: activeChannel._id,
          content: messageInput,
          workspaceId: currentWorkspace._id,
          attachments,
          mentions,
        });
        sendTypingStop(activeChannel._id, currentUser.id);
      }

      setMessageInput('');
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    } catch (error) {
      console.error('❌ Error sending message:', error);
      setUploading(false);
    }
  };

  const handleTyping = () => {
    if (!activeChannel || !currentUser) return;

    sendTypingStart(activeChannel._id, currentUser.id, currentUser.fullName);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStop(activeChannel._id, currentUser.id);
    }, 3000);
  };

  const createChannel = async () => {
    if (!newChannelName.trim() || !currentWorkspace) return;

    try {
      const channelData: any = await channelAPI.create({
        name: newChannelName,
        description: newChannelDesc,
        workspaceId: currentWorkspace._id,
        isPrivate,
      });

      setChannels(prev => [...prev, channelData.channel]);
      setShowCreateChannel(false);
      setNewChannelName('');
      setNewChannelDesc('');
      setIsPrivate(false);
    } catch (error) {
      console.error('❌ Error creating channel:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    disconnectSocket();
    navigate('/login');
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    try {
      await messageAPI.editMessage(messageId, newContent);
    } catch (error) {
      console.error('❌ Error editing message:', error);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await messageAPI.deleteMessage(messageId);
    } catch (error) {
      console.error('❌ Error deleting message:', error);
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      await messageAPI.addReaction(messageId, emoji);
    } catch (error) {
      console.error('❌ Error adding reaction:', error);
    }
  };

  const handleShowThread = (message: Message) => {
    setActiveThread(message);
    setShowThreadPanel(true);
    joinThread(message._id);
  };

  const handleCloseThread = () => {
    if (activeThread) {
      leaveThread(activeThread._id);
    }
    setShowThreadPanel(false);
    setActiveThread(null);
  };

  const handleShowProfile = (user: User) => {
    setActiveProfileUser(user);
    setShowProfilePanel(true);
    if (window.innerWidth < 1200) {
      handleCloseThread();
    }
  };

  const handleSendThreadReply = async (content: string) => {
    if (!activeThread || !activeChannel || !currentWorkspace) return;

    try {
      await messageAPI.sendChannelMessage({
        channelId: activeChannel._id,
        content,
        workspaceId: currentWorkspace._id,
        threadId: activeThread._id,
      });
    } catch (error) {
      console.error('❌ Error sending thread reply:', error);
    }
  };

  // ── Mark messages as read (HTTP + Socket) ──────────────────────────────────
  useEffect(() => {
    if (!messages.length || !currentUser) return;
    const socket = getSocket();
    const currentUserId = currentUser.id || currentUser._id;
    if (!currentUserId) return;

    const currentChannelId = activeChannel?._id || activeDMUser?._id || activeDMUser?.id;

    const unread = messages.filter(m => {
      // Guard: skip messages with no senderId
      if (!m.senderId) return false;

      const senderId = typeof m.senderId === 'object'
        ? (m.senderId._id || m.senderId.id)
        : m.senderId;

      // Don't mark own messages as read
      if (senderId === currentUserId) return false;

      // Check if already marked read by current user
      const readByArr = m.readBy || [];
      const alreadyRead = readByArr.some(r => {
        if (!r || !r.userId) return false;
        const rId = typeof r.userId === 'object'
          ? (r.userId._id || r.userId.id)
          : r.userId;
        return rId === currentUserId;
      });

      return !alreadyRead;
    });

    if (!unread.length) return;

    // HTTP mark-as-read (for persistence)
    unread.forEach(msg => {
      messageAPI.markAsRead(msg._id).catch(() => { });
    });

    // Socket emit (for live double-tick updates)
    if (socket && currentChannelId) {
      socket.emit('message:read', {
        messageIds: unread.map(m => m._id),
        channelId: currentChannelId,
        readBy: currentUserId,
      });
    }
  }, [messages, activeChannel, activeDMUser, currentUser]);

  // Keyboard shortcut for search modal (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearchModal(true);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    activeChannelRef.current = activeChannel;
  }, [activeChannel]);

  useEffect(() => {
    activeDMUserRef.current = activeDMUser;
  }, [activeDMUser]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessageInput(value);

    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const textAfterAt = value.substring(lastAtIndex + 1);
      if (!textAfterAt.includes(' ')) {
        setMentionSearch(textAfterAt);
        setShowMentions(true);
        setMentionPosition({ top: -200, left: 0 });
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }

    handleTyping();
  };

  const handleMentionSelect = (user: User) => {
    const lastAtIndex = messageInput.lastIndexOf('@');
    const newInput = messageInput.substring(0, lastAtIndex) + `@${user.fullName} `;
    setMessageInput(newInput);
    setShowMentions(false);
  };

  const handleSelectDMUser = async (user: User) => {
    if (activeChannel) {
      leaveChannel(activeChannel._id);
    }

    setActiveDMUser(user);
    setShowDM(true);
    setActiveChannel(null);
    setMessageInput('');
    setShowUserSearch(false);

    // Mark DM as read
    const userId = user._id || user.id;
    setUnreadDMs(prev => {
      const newMap = new Map(prev);
      newMap.delete(userId);
      return newMap;
    });

    if (!currentWorkspace) return;
    try {
      const messagesData: any = await messageAPI.getDirectMessages(user._id || user.id, currentWorkspace._id);
      setMessages(messagesData.messages || []);
      scrollToBottom();
    } catch (error) {
      console.error('❌ Error fetching DM messages:', error);
    }
  };

  const handleOpenChannelSettings = (channel: Channel) => {
    setSelectedChannel(channel);
    setShowChannelSettings(true);
  };

  const handleAddMemberToChannel = async (email: string) => {
    if (!selectedChannel) return;

    try {
      await channelAPI.addMemberByEmail(selectedChannel._id, email);
      alert('Member added successfully!');
      // Refresh channel data
      const channelData: any = await channelAPI.getDetails(selectedChannel._id);
      setSelectedChannel(channelData.channel);
    } catch (error: any) {
      alert(error.message || 'Failed to add member');
    }
  };

  const handleRemoveMemberFromChannel = async (memberId: string) => {
    if (!selectedChannel) return;

    try {
      await channelAPI.removeMember(selectedChannel._id, memberId);
      alert('Member removed successfully!');
      // Refresh channel data
      const channelData: any = await channelAPI.getDetails(selectedChannel._id);
      setSelectedChannel(channelData.channel);
    } catch (error: any) {
      alert(error.message || 'Failed to remove member');
    }
  };

  const handleUpdateChannel = async (data: any) => {
    if (!selectedChannel) return;

    try {
      await channelAPI.update(selectedChannel._id, data);
      alert('Channel updated successfully!');
      // Refresh channels list
      await fetchChannelsForWorkspace(currentWorkspace!._id);
    } catch (error: any) {
      alert(error.message || 'Failed to update channel');
    }
  };

  const handleDeleteChannel = async () => {
    if (!selectedChannel) return;

    if (!confirm(`Are you sure you want to delete #${selectedChannel.name}?`)) {
      return;
    }

    try {
      await channelAPI.delete(selectedChannel._id);
      setShowChannelSettings(false);
      // Refresh channels list
      await fetchChannelsForWorkspace(currentWorkspace!._id);
      setActiveChannel(null);
    } catch (error: any) {
      alert(error.message || 'Failed to delete channel');
    }
  };

  const handleUpdateChannelPrivacy = async (isPrivate: boolean) => {
    if (!selectedChannel) return;

    try {
      await channelAPI.updatePrivacy(selectedChannel._id, isPrivate);
      setSelectedChannel(prev => prev ? { ...prev, isPrivate } : null);
      // Refresh channels list to update privacy indicator
      await fetchChannelsForWorkspace(currentWorkspace!._id);
    } catch (error: any) {
      alert(error.message || 'Failed to update channel privacy');
    }
  };

  const handlePromoteToAdmin = async (memberId: string) => {
    if (!selectedChannel) return;

    try {
      await channelAPI.promoteToAdmin(selectedChannel._id, memberId);
      alert('Member promoted to admin successfully!');

      const channelData: any = await channelAPI.getDetails(selectedChannel._id);
      setSelectedChannel(channelData.channel);

      await fetchChannelsForWorkspace(currentWorkspace!._id);
    } catch (error: any) {
      alert(error.message || 'Failed to promote member');
    }
  };

  const handleDemoteFromAdmin = async (memberId: string) => {
    if (!selectedChannel) return;

    try {
      await channelAPI.demoteFromAdmin(selectedChannel._id, memberId);
      alert('Admin demoted successfully!');

      const channelData: any = await channelAPI.getDetails(selectedChannel._id);
      setSelectedChannel(channelData.channel);

      await fetchChannelsForWorkspace(currentWorkspace!._id);
    } catch (error: any) {
      alert(error.message || 'Failed to demote admin');
    }
  };

  const handleReportMessage = async (messageId: string) => {
    const reason = prompt('Please enter a reason for reporting this message:');
    if (reason) {
      try {
        await messageAPI.reportMessage(messageId, reason);
        alert('Message reported successfully.');
      } catch (error) {
        console.error('Failed to report message:', error);
        alert('Failed to report message.');
      }
    }
  };

  const handleBookmarkMessage = (messageId: string) => {
    setBookmarkedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
        showToast('Bookmark removed', 'info');
      } else {
        newSet.add(messageId);
        showToast('Message bookmarked', 'success');
      }
      return newSet;
    });
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const getInitials = (name: string) => {
    if (!name || typeof name !== 'string') return 'U';
    const names = name.trim().split(' ').filter(Boolean);
    if (names.length === 0) return 'U';
    if (names.length === 1) return names[0].slice(0, 2).toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const handleLeaveChannel = async () => {
    if (!activeChannel) return;

    if (activeChannel.name === 'general') {
      showToast('Cannot leave general channel', 'error');
      return;
    }

    if (!confirm(`Are you sure you want to leave #${activeChannel.name}?`)) {
      return;
    }

    try {
      await channelAPI.leave(activeChannel._id);
      await fetchChannelsForWorkspace(currentWorkspace!._id);
      setActiveChannel(null);
      setMessages([]);
      showToast(`Left #${activeChannel.name} successfully`, 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to leave channel', 'error');
    }
  };

  // Check if user is channel admin
  const isChannelAdmin = activeChannel ? (
    activeChannel.admins?.some((adminId: any) => {
      const aid = typeof adminId === 'object' ? adminId._id || adminId.id : adminId;
      const uid = currentUser?._id || currentUser?.id;
      return aid === uid;
    }) || false
  ) : false;

  // Check if user is admin
  const isWorkspaceAdmin = currentWorkspace?.members?.some((m: any) => {
    const memberId = m.userId?._id || m.userId?.id || m.userId;
    const currentUserId = currentUser?._id || currentUser?.id;
    return memberId === currentUserId && (m.role === 'owner' || m.role === 'admin');
  }) || false;

  // Filter members for user search
  const filteredMembers = workspaceMembers.filter(member => {
    const isCurrentUser = (member._id === currentUser?._id) || (member.id === currentUser?.id);
    if (isCurrentUser) return false;

    return member.fullName.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(userSearchQuery.toLowerCase());
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading SyncSpace...</p>
        </div>
      </div>
    );
  }

  if (error && !currentWorkspace) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-2">Connection Error</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 rounded-lg bg-gradient-to-r from-primary to-secondary text-white font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const activeTypingUsers = typingUsers.filter(u => u.channelId === activeChannel?._id && u.userId !== currentUser?.id);

  return (
    <div className="h-screen flex bg-[#0f0f0f] text-white">

      {/* ═══════════════════════════════════════════════
          SIDEBAR - Replace the entire <aside> block
          from line: <aside className="w-64 bg-[#141414]...
          to the closing: </aside>
      ═══════════════════════════════════════════════ */}

      <aside className="w-64 bg-[#141414] border-r border-[#1f1f1f] flex flex-col select-none">

        {/* ── Workspace Header ── */}
        <div className="px-4 py-3 border-b border-[#1f1f1f] relative">
          <button
            onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
            className="w-full flex items-center justify-between hover:bg-[#1f1f1f] px-2 py-1.5 -mx-2 rounded-lg transition-colors group"
          >
            <div className="flex items-center gap-2 min-w-0">
              {/* Workspace icon */}
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                {(currentWorkspace?.name || 'S').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 text-left">
                <h1 className="text-sm font-bold text-white truncate leading-tight">
                  {currentWorkspace?.name || 'SyncSpace'}
                </h1>
                <p className="text-[10px] text-green-400 font-medium leading-tight">
                  ● {workspaceMembers.filter(m => m.status === 'online').length || 0} online
                </p>
              </div>
            </div>
            <svg
              className={`w-4 h-4 text-gray-500 group-hover:text-white transition-all flex-shrink-0 ${showWorkspaceMenu ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Workspace Dropdown */}
          {showWorkspaceMenu && (
            <div className="absolute top-full left-0 w-full mt-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl shadow-2xl z-50 overflow-hidden">
              <div className="max-h-56 overflow-y-auto">
                <div className="px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  Switch Workspace
                </div>
                {workspaces.map(ws => (
                  <button
                    key={ws._id}
                    onClick={() => handleSwitchWorkspace(ws)}
                    className={`w-full text-left px-4 py-2.5 hover:bg-[#2a2a2a] transition-colors flex items-center gap-3 ${currentWorkspace?._id === ws._id ? 'text-primary' : 'text-gray-300'}`}
                  >
                    <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary/40 to-secondary/40 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                      {ws.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm truncate flex-1">{ws.name}</span>
                    {currentWorkspace?._id === ws._id && (
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
              <div className="border-t border-[#2a2a2a] p-2 space-y-0.5">
                {[
                  { icon: 'M12 4v16m8-8H4', label: 'Invite Members', action: () => { setShowInviteModal(true); setShowWorkspaceMenu(false); } },
                  { icon: 'M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z', label: 'Create Workspace', action: () => { setShowCreateWorkspaceModal(true); setShowWorkspaceMenu(false); } },
                  { icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1', label: 'Join Workspace', action: () => { setShowJoinWorkspaceModal(true); setShowWorkspaceMenu(false); } },
                ].map(({ icon, label, action }) => (
                  <button key={label} onClick={action}
                    className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-[#2a2a2a] hover:text-white rounded-lg flex items-center gap-2.5 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                    </svg>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Scrollable Nav ── */}
        <div className="flex-1 overflow-y-auto py-3 space-y-5">

          {/* ── Search Shortcut Pill ── */}
          <div className="px-3">
            <button
              onClick={() => setShowSearchModal(true)}
              className="w-full flex items-center gap-2.5 px-3 py-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] hover:border-[#3a3a3a] rounded-lg text-gray-500 hover:text-gray-300 text-xs transition-all group"
            >
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="flex-1 text-left">Search...</span>
              <span className="text-[10px] bg-[#2a2a2a] group-hover:bg-[#333] px-1.5 py-0.5 rounded font-mono text-gray-600 group-hover:text-gray-400 transition-colors">⌃K</span>
            </button>
          </div>

          {/* ── Active Group Call Banner ── */}
          {groupCall && activeChannel && groupCall.channelId === activeChannel._id && (
            <div className="mx-3">
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 p-3">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent pointer-events-none" />
                <div className="flex items-center gap-2 mb-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-400">Active call in #{activeChannel.name}</span>
                </div>
                <button
                  onClick={() => startGroupCall(activeChannel._id, groupCall.callType || 'voice')}
                  className="w-full py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs font-semibold transition-all hover:text-emerald-300"
                >
                  Join Call
                </button>
              </div>
            </div>
          )}

          {/* ── Channels Section ── */}
          <div className="px-3">
            <div className="flex items-center justify-between mb-1 px-1">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">Channels</span>
              <button
                onClick={() => setShowCreateChannel(true)}
                className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-white hover:bg-[#2a2a2a] rounded transition-colors"
                title="Create channel"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            <div className="space-y-0.5">
              {channels.map(channel => {
                const isAdmin = channel.admins?.some((adminId: any) => {
                  const aid = typeof adminId === 'object' ? adminId._id : adminId;
                  return aid === (currentUser?._id || currentUser?.id);
                });
                const isActive = activeChannel?._id === channel._id;
                const hasUnread = unreadChannels.has(channel._id);

                return (
                  <button
                    key={channel._id}
                    onClick={() => selectChannel(channel)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenuChannel(channel);
                      setContextMenuPos({ x: e.clientX, y: e.clientY });
                      setShowChannelContextMenu(true);
                    }}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all group ${isActive
                      ? 'bg-primary/15 text-white'
                      : 'text-gray-400 hover:bg-[#1e1e1e] hover:text-gray-200'
                      }`}
                  >
                    <span className={`text-sm font-medium flex-shrink-0 ${isActive ? 'text-primary' : 'text-gray-500'}`}>
                      {channel.isPrivate ? '🔒' : '#'}
                    </span>
                    <span className={`text-sm truncate flex-1 ${hasUnread ? 'font-semibold text-white' : isActive ? 'font-medium' : ''}`}>
                      {channel.name}
                    </span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {hasUnread && !isActive && (
                        <span className="w-2 h-2 bg-primary rounded-full"></span>
                      )}
                      {isAdmin && (
                        <span className="text-[9px] px-1 py-0.5 bg-primary/20 text-primary rounded font-medium hidden group-hover:inline">
                          Admin
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Divider ── */}
          <div className="mx-3 border-t border-[#1f1f1f]" />

          {/* ── Direct Messages Section ── */}
          <div className="px-3">
            <div className="flex items-center justify-between mb-1 px-1">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">Direct Messages</span>
              <button
                onClick={() => setShowUserSearch(!showUserSearch)}
                className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-white hover:bg-[#2a2a2a] rounded transition-colors"
                title="New direct message"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            {/* DM Search Input */}
            {showUserSearch && (
              <div className="mb-2">
                <div className="relative">
                  <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Find a member..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-[#1e1e1e] text-white text-xs rounded-lg border border-[#2a2a2a] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 placeholder-gray-600"
                    autoFocus
                  />
                </div>
              </div>
            )}

            {/* DM List */}
            <div className="space-y-0.5">
              {(showUserSearch && userSearchQuery ? filteredMembers : (() => {
                // ── FIX: Build DM list from dmConversations properly ──
                // Each conversation has a `participants` array; find the other user
                const seen = new Set<string>();
                const items: { user: User; conversation?: any }[] = [];

                dmConversations.forEach((conv: any) => {
                  // Try participants array first (populated)
                  if (conv.participants && Array.isArray(conv.participants)) {
                    const other = conv.participants.find((p: any) => {
                      const pid = p._id || p.id;
                      return pid !== currentUser?._id && pid !== currentUser?.id;
                    });
                    if (other && (other._id || other.id)) {
                      const uid = other._id || other.id;
                      if (!seen.has(uid)) {
                        seen.add(uid);
                        items.push({ user: other, conversation: conv });
                      }
                    }
                  }
                  // Fallback: item itself is a user object (from workspaceMembers shape)
                  else if (conv.userId || conv.fullName) {
                    const u = conv.userId || conv;
                    const uid = u._id || u.id;
                    if (uid && uid !== currentUser?._id && uid !== currentUser?.id && !seen.has(uid)) {
                      seen.add(uid);
                      items.push({ user: u, conversation: conv });
                    }
                  }
                });
                return items.slice(0, 10);
              })()).map((item: any) => {
                // Handle both shapes: raw user OR { user, conversation } object
                const user: User = item.user || item;
                const uid = user._id || user.id || '';
                if (!uid) return null;
                if (uid === currentUser?._id || uid === currentUser?.id) return null;

                const isActive = activeDMUser?._id === uid || activeDMUser?.id === uid;
                const unreadCount = unreadDMs.get(uid) || 0;

                // Match status from workspaceMembers (which has live status updates)
                const liveMember = workspaceMembers.find(m => m._id === uid || m.id === uid);
                const isOnline = (liveMember?.status || user.status) === 'online';
                const displayName = user.fullName || 'Unknown';
                const initials = getInitials(displayName);

                return (
                  <button
                    key={uid}
                    onClick={() => handleSelectDMUser(user)}
                    className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-all group ${isActive
                      ? 'bg-primary/15 text-white'
                      : 'text-gray-400 hover:bg-[#1e1e1e] hover:text-gray-200'
                      }`}
                  >
                    {/* Avatar with online dot */}
                    <div className="relative flex-shrink-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white font-semibold text-xs ${isActive ? 'bg-gradient-to-br from-primary to-secondary' : 'bg-gradient-to-br from-primary/30 to-secondary/30'
                        }`}>
                        {initials}
                      </div>
                      {/* Online indicator */}
                      <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#141414] ${isOnline ? 'bg-green-500' : 'bg-gray-600'
                        }`} />
                    </div>

                    <span className={`text-sm truncate flex-1 ${unreadCount > 0 ? 'font-semibold text-white' : ''}`}>
                      {displayName}
                    </span>

                    {unreadCount > 0 && (
                      <span className="flex-shrink-0 min-w-[18px] h-[18px] px-1 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {showUserSearch && userSearchQuery && filteredMembers.length === 0 && (
              <p className="text-xs text-gray-600 text-center py-3">No members found</p>
            )}
          </div>
        </div>

        {/* ── User Profile Footer ── */}
        <div className="px-3 py-3 border-t border-[#1f1f1f] bg-[#111111]">
          <div className="flex items-center gap-2.5">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-xs">
                {currentUser ? getInitials(currentUser.fullName) : '?'}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#111111] bg-green-500" />
            </div>

            {/* Name + email */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate leading-tight">{currentUser?.fullName}</p>
              <p className="text-[10px] text-gray-500 truncate leading-tight">{currentUser?.email}</p>
            </div>

            {/* Logout icon button */}
            <button
              onClick={handleLogout}
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
              title="Sign out"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>

      </aside>


      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col overflow-x-hidden relative">

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col">
          {/* Channel Header - ONLY ONE */}
          {activeChannel && !showDM && (
            <ChannelHeader
              channelName={activeChannel.name}
              description={activeChannel.description || undefined}
              isPrivate={activeChannel.isPrivate || false}
              memberCount={activeChannel.members?.length}
              onShowInfo={() => setShowChannelInfo(true)}
              onShowSettings={() => handleOpenChannelSettings(activeChannel)}
              onSearch={() => setShowSearchModal(true)}
              onAddPeople={() => setShowAddPeopleModal(true)}
              isAdmin={isChannelAdmin}
              onShowBookmarks={() => setShowBookmarks(true)}
              onShowMediaFiles={() => setShowMediaFiles(true)}
              onScheduleMeeting={handleOpenScheduler}
              onStartMeeting={handleOpenMeetingsList}
              onStartGroupCall={(callType) => startGroupCall(activeChannel._id, callType)}
              onStartScreenShare={(channelId) => {
                startRoom(channelId);
                setShowScreenShareRoom(true);
              }}
              activeScreenShareRooms={availableRooms}
              onJoinScreenShare={(roomId) => {
                joinRoom(roomId);
                setShowScreenShareRoom(true);
              }}
              channelId={activeChannel._id}
              isGroupCallActive={!!groupCall}
            />
          )}

          {/* DM Header */}
          {showDM && activeDMUser && (
            <header className="h-16 bg-[#0a0a0a] border-b border-[#1f1f1f] px-6 flex items-center gap-3 justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-white font-semibold">
                  {getInitials(activeDMUser.fullName)}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">{activeDMUser.fullName}</h2>
                  <p className="text-xs text-gray-500">{activeDMUser.email}</p>
                </div>
              </div>

              {/* 📞 CALL BUTTONS */}
              <div className="flex items-center gap-2">
                {mediaError && (
                  <span className="text-xs text-red-400 max-w-[160px] truncate" title={mediaError}>
                    ⚠ {mediaError}
                  </span>
                )}
                <button
                  onClick={() => initiateCall(activeDMUser._id || activeDMUser.id, 'voice')}
                  disabled={isCallActive}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-green-500/10 hover:bg-green-500/20 text-green-400 hover:text-green-300 border border-green-500/20 hover:border-green-500/30"
                  title={`Voice call ${activeDMUser.fullName}`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Voice
                </button>
                <button
                  onClick={() => initiateCall(activeDMUser._id || activeDMUser.id, 'video')}
                  disabled={isCallActive}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 border border-blue-500/20 hover:border-blue-500/30"
                  title={`Video call ${activeDMUser.fullName}`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Video
                </button>
              </div>
            </header>
          )}

          {/* Messages Area */}
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-6 space-y-4"
          >
            {!activeChannel && !showDM ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-gray-400 mb-2">Welcome to SyncSpace!</h3>
                  <p className="text-gray-600">Select a channel or start a direct message</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-gray-400 mb-2">No messages yet</h3>
                  <p className="text-gray-600">
                    {showDM && activeDMUser
                      ? `Start a conversation with ${activeDMUser.fullName}`
                      : `Be the first to message #${activeChannel?.name}`}
                  </p>
                </div>
              </div>
            ) : (
              [...new Map(messages.map(m => [m._id, m])).values()].map((message) => {
                if (!currentUser) return null;

                if (showDM && activeDMUser) {
                  const senderId = typeof message.senderId === 'object' ? (message.senderId._id || message.senderId.id) : message.senderId;
                  const recipientId = typeof message.recipientId === 'object' ? (message.recipientId._id || message.recipientId.id) : message.recipientId;
                  const currentUserId = currentUser._id || currentUser.id;
                  const selectedUserId = activeDMUser._id || activeDMUser.id;

                  const isFromCurrentUser = senderId === currentUserId;
                  const isToCurrentUser = recipientId === currentUserId;
                  const isDMWithSelectedUser = senderId === selectedUserId || recipientId === selectedUserId;

                  if (!(isFromCurrentUser || isToCurrentUser) || !isDMWithSelectedUser) return null;
                } else if (activeChannel) {
                  if (message.messageType !== 'channel' || message.channelId !== activeChannel._id) return null;
                }

                return (
                  <MessageItem
                    key={message._id}
                    message={message}
                    currentUser={currentUser}
                    onEdit={handleEditMessage}
                    onDelete={handleDeleteMessage}
                    onReply={handleShowThread}
                    onReaction={handleReaction}
                    onShowThread={handleShowThread}
                    onShowProfile={handleShowProfile}
                    onReport={handleReportMessage}
                    onBookmark={() => handleBookmarkMessage(message._id)}
                    isBookmarked={bookmarkedMessages.has(message._id)}
                  />
                );
              })
            )}

            {/* Typing Indicator */}
            {activeTypingUsers.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-400 italic px-4 py-2 bg-[#0f0f0f] rounded">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
                <span>
                  {activeTypingUsers.length === 1
                    ? `${activeTypingUsers[0].userName} is typing...`
                    : activeTypingUsers.length === 2
                      ? `${activeTypingUsers[0].userName} and ${activeTypingUsers[1].userName} are typing...`
                      : `${activeTypingUsers.length} people are typing...`
                  }
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ── Scroll To Bottom FAB ── */}
          {showScrollFAB && (activeChannel || showDM) && (
            <button
              onClick={() => {
                messagesContainerRef.current?.scrollTo({ top: messagesContainerRef.current.scrollHeight, behavior: 'smooth' });
                setUnreadBelowFold(0);
              }}
              className="absolute bottom-24 right-6 z-30 flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#1a1a2e] border border-primary/30 text-white text-xs font-semibold shadow-2xl hover:bg-[#24243e] transition-all hover:scale-105 backdrop-filter backdrop-blur-sm"
              style={{ boxShadow: '0 4px 24px rgba(124,58,237,.35)' }}
            >
              {unreadBelowFold > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadBelowFold > 9 ? '9+' : unreadBelowFold}
                </span>
              )}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
              New messages
            </button>
          )}
        </div>

        {/* Message Input */}
        {(activeChannel || showDM) && (
          <div className="p-4 border-t border-[#1f1f1f] relative">
            {showMentions && (
              <MentionAutocomplete
                members={workspaceMembers}
                onSelect={handleMentionSelect}
                searchTerm={mentionSearch}
                position={mentionPosition}
              />
            )}

            {showEmojiPicker && (
              <EmojiPickerComponent
                onEmojiSelect={(emoji) => setMessageInput(prev => prev + emoji)}
                onClose={() => setShowEmojiPicker(false)}
              />
            )}

            <div className="mb-2">
              <FileUpload
                onFileSelect={setSelectedFiles}
                maxFiles={5}
                maxSizeMB={10}
              />
              {uploading && (
                <div className="text-xs text-primary mt-1 animate-pulse">
                  Uploading files...
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2 text-gray-400 hover:text-white transition-colors"
                title="Add emoji"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>

              <input
                type="text"
                value={messageInput}
                onChange={handleInputChange}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder={showDM && activeDMUser ? `Message ${activeDMUser.fullName}` : activeChannel ? `Message #${activeChannel.name}` : 'Select a channel or DM'}
                className="flex-1 px-4 py-3 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <button
                onClick={sendMessage}
                disabled={!messageInput.trim() && selectedFiles.length === 0}
                className="px-6 py-3 rounded-lg bg-gradient-to-r from-primary to-secondary text-white font-medium hover:shadow-lg hover:shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Send
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Invite Members Component */}
      {showInviteModal && (
        <InviteMembers
          workspace={currentWorkspace}
          onClose={() => setShowInviteModal(false)}
          onMemberInvited={(message) => {
            console.log('✅', message);
            // Refresh workspace members
            if (currentWorkspace) {
              fetchWorkspaceMembers(currentWorkspace._id);
            }
          }}
          workspaceMembers={workspaceMembers}
        />
      )}

      {/* Create Workspace Modal */}
      {showCreateWorkspaceModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1a] p-6 rounded-2xl w-full max-w-md border border-[#2a2a2a]">
            <h2 className="text-xl font-bold text-white mb-4">Create New Workspace</h2>
            <input
              type="text"
              placeholder="Workspace Name"
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleCreateWorkspace();
                }
              }}
              className="w-full px-4 py-3 rounded-lg bg-[#0f0f0f] border border-[#2a2a2a] text-white placeholder-gray-500 focus:outline-none focus:border-primary mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCreateWorkspaceModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateWorkspace}
                disabled={!newWorkspaceName.trim()}
                className="px-6 py-2 rounded-lg bg-gradient-to-r from-primary to-secondary text-white font-medium hover:shadow-lg hover:shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Join Workspace Modal */}
      {showJoinWorkspaceModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1a] p-6 rounded-2xl w-full max-w-md border border-[#2a2a2a]">
            <h2 className="text-xl font-bold text-white mb-4">Join Workspace</h2>
            <p className="text-gray-400 text-sm mb-4">Enter the invite code shared by your workspace admin.</p>
            <input
              type="text"
              placeholder="Invite Code"
              value={joinInviteCode}
              onChange={(e) => setJoinInviteCode(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleJoinWorkspace();
                }
              }}
              className="w-full px-4 py-3 rounded-lg bg-[#0f0f0f] border border-[#2a2a2a] text-white placeholder-gray-500 focus:outline-none focus:border-primary mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowJoinWorkspaceModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleJoinWorkspace}
                disabled={!joinInviteCode.trim()}
                className="px-6 py-2 rounded-lg bg-gradient-to-r from-primary to-secondary text-white font-medium hover:shadow-lg hover:shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Join
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Channel Modal */}
      {showCreateChannel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Create Channel</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Channel Name</label>
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="e.g. marketing"
                  className="w-full px-4 py-2 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description (optional)</label>
                <textarea
                  value={newChannelDesc}
                  onChange={(e) => setNewChannelDesc(e.target.value)}
                  placeholder="What's this channel about?"
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-white focus:outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPrivate"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 text-primary focus:ring-primary"
                />
                <label htmlFor="isPrivate" className="text-sm text-gray-300">Make private</label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateChannel(false);
                  setNewChannelName('');
                  setNewChannelDesc('');
                  setIsPrivate(false);
                }}
                className="flex-1 px-4 py-2 rounded-lg bg-[#1a1a1a] text-gray-300 hover:bg-[#2a2a2a] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={createChannel}
                disabled={!newChannelName.trim()}
                className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-secondary text-white font-medium hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thread Panel */}
      {showThreadPanel && activeThread && currentUser && (
        <ThreadPanel
          parentMessage={activeThread}
          currentUser={currentUser}
          onClose={handleCloseThread}
          onSendReply={handleSendThreadReply}
          onEditMessage={handleEditMessage}
          onDeleteMessage={handleDeleteMessage}
          onReaction={handleReaction}
          onShowProfile={handleShowProfile}
        />
      )}

      {/* Profile Panel */}
      {showProfilePanel && activeProfileUser && currentUser && (
        <ProfilePanel
          user={activeProfileUser}
          currentUser={currentUser}
          onClose={() => setShowProfilePanel(false)}
          onMessage={() => {
            setShowProfilePanel(false);
            handleSelectDMUser(activeProfileUser);
          }}
          onProfileUpdate={(updatedUser) => {
            setActiveProfileUser(updatedUser);
            if (currentUser.id === updatedUser.id || currentUser._id === updatedUser.id) {
              setCurrentUser(updatedUser);
            }
          }}
        />
      )}

      {/* Channel Settings Modal */}
      {showChannelSettings && selectedChannel && currentUser && (
        <ChannelSettings
          channel={selectedChannel}
          currentUser={currentUser}
          workspaceMembers={workspaceMembers}
          onClose={() => setShowChannelSettings(false)}
          onAddMember={handleAddMemberToChannel}
          onRemoveMember={handleRemoveMemberFromChannel}
          onUpdateChannel={handleUpdateChannel}
          onUpdatePrivacy={handleUpdateChannelPrivacy}
          onDeleteChannel={handleDeleteChannel}
          onPromoteToAdmin={handlePromoteToAdmin}
          onDemoteFromAdmin={handleDemoteFromAdmin}
          isAdmin={isWorkspaceAdmin}
        />
      )}

      {/* Channel Context Menu */}
      {showChannelContextMenu && contextMenuChannel && (
        <ChannelContextMenu
          channel={contextMenuChannel}
          x={contextMenuPos.x}
          y={contextMenuPos.y}
          onClose={() => setShowChannelContextMenu(false)}
          onEdit={(channel) => {
            setSelectedChannel(channel);
            setShowChannelSettings(true);
            setShowChannelContextMenu(false);
          }}
          onDelete={() => {
            setShowChannelContextMenu(false);
            // Will add delete functionality later
          }}
        />
      )}

      {/* Notification Preferences Modal */}
      {showNotificationPrefs && activeChannel && (
        <NotificationPreferences
          channelId={activeChannel._id}
          onClose={() => setShowNotificationPrefs(false)}
          onSave={(prefs) => {
            console.log('Notification preferences saved:', prefs);
          }}
        />
      )}

      {/* Channel Details Menu */}
      {showChannelDetailsMenu && activeChannel && (
        <ChannelDetailsMenu
          channel={activeChannel}
          onClose={() => setShowChannelDetailsMenu(false)}
          onNotifications={() => setShowNotificationPrefs(true)}
          onStar={() => console.log('Star channel')}
          onMoveChannel={() => console.log('Move channel')}
          onAddTemplate={() => console.log('Add template')}
          onAddWorkflow={() => console.log('Add workflow')}
          onEditSettings={() => {
            setSelectedChannel(activeChannel);
            setShowChannelSettings(true);
            setShowChannelDetailsMenu(false);
          }}
        />
      )}

      {/* Add People Modal */}
      {showAddPeopleModal && activeChannel && (
        <AddPeopleModal
          channel={activeChannel.name}
          onClose={() => setShowAddPeopleModal(false)}
          onAdd={async (email) => {
            try {
              await channelAPI.addMemberByEmail(activeChannel._id, email);
              alert('Member added successfully!');
              const channelData: any = await channelAPI.getDetails(activeChannel._id);
              setActiveChannel(channelData.channel);
              await fetchChannelsForWorkspace(currentWorkspace!._id);
              setShowAddPeopleModal(false);
            } catch (error: any) {
              alert(error.message || 'Failed to add member');
            }
          }}
          workspaceMembers={workspaceMembers}
          channelMembers={activeChannel.members || []}
        />
      )}

      {/* Workspace Menu Modal */}
      {showWorkspaceMenuModal && (
        <WorkspaceMenu
          workspaceName={currentWorkspace?.name || 'Workspace'}
          onClose={() => setShowWorkspaceMenuModal(false)}
          onBrowseTemplates={() => console.log('Browse templates')}
          onInvitePeople={() => setShowInviteModal(true)}
          onSettings={() => console.log('Settings')}
        />
      )}

      {/* Search Modal */}
      <SearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        workspaceMembers={workspaceMembers}
        currentWorkspaceId={currentWorkspace?._id || ''}
        onSelectUser={(user) => handleSelectDMUser(user)}
        onSelectMessage={(message) => {
          if (message.channelId) {
            const channel = channels.find(c => c._id === message.channelId);
            if (channel) {
              selectChannel(channel);
            }
          }
        }}
      />

      {/* Keyboard Shortcuts Modal */}
      {showKeybindsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-xl max-w-md w-full mx-4 max-h-96 overflow-y-auto">
            <div className="p-6 border-b border-[#2a2a2a] flex items-center justify-between sticky top-0 bg-[#1a1a1a]">
              <h2 className="text-xl font-bold">Keyboard Shortcuts</h2>
              <button
                onClick={() => setShowKeybindsModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-300 uppercase">General</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Show shortcuts</span>
                    <kbd className="px-2 py-1 bg-[#2a2a2a] text-gray-300 rounded text-xs">⌘K / Ctrl+K</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Search messages</span>
                    <kbd className="px-2 py-1 bg-[#2a2a2a] text-gray-300 rounded text-xs">⌘/ / Ctrl+/</kbd>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-300 uppercase">Messages</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Send message</span>
                    <kbd className="px-2 py-1 bg-[#2a2a2a] text-gray-300 rounded text-xs">Enter</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Copy message</span>
                    <kbd className="px-2 py-1 bg-[#2a2a2a] text-gray-300 rounded text-xs">Hover & Click</kbd>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-300 uppercase">Features</h3>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-400">• Use @ to mention members</p>
                  <p className="text-gray-400">• Use emoji reactions on messages</p>
                  <p className="text-gray-400">• Reply in threads for organized discussions</p>
                  <p className="text-gray-400">• Check unread indicators for new messages</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Channel Info Panel (WhatsApp Style) */}
      {showChannelInfo && activeChannel && currentUser && (
        <ChannelInfo
          channel={activeChannel}
          currentUser={currentUser}
          workspaceMembers={workspaceMembers}
          onClose={() => setShowChannelInfo(false)}
          onLeaveChannel={handleLeaveChannel}
          onOpenSettings={() => {
            setShowChannelInfo(false);
            handleOpenChannelSettings(activeChannel);
          }}
          isAdmin={isChannelAdmin}
        />
      )}

      {/* Bookmarks Panel */}
      {showBookmarks && (
        <BookmarksPanel
          messages={messages}
          bookmarkedMessageIds={bookmarkedMessages}
          onRemoveBookmark={handleBookmarkMessage}
          onClose={() => setShowBookmarks(false)}
        />
      )}

      {/* Media & Files Panel */}
      {showMediaFiles && activeChannel && (
        <MediaFilesPanel
          messages={messages}
          onClose={() => setShowMediaFiles(false)}
        />
      )}

      {/* Meeting Scheduler Modal */}
      {isSchedulerOpen && (
        <MeetingScheduler
          isOpen={isSchedulerOpen}
          onClose={() => setIsSchedulerOpen(false)}
          workspaceId={currentWorkspace?._id}
          channelId={activeChannel?._id}
        />
      )}

      {/* Meetings List Modal */}
      {isMeetingsListOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Your Meetings
              </h2>
              <button
                onClick={() => setIsMeetingsListOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-5rem)]">
              <ScheduledMeetingsList
                workspaceId={currentWorkspace?._id}
                channelId={activeChannel?._id}
                onJoinMeeting={handleJoinMeeting}
              />
            </div>
          </div>
        </div>
      )}

      {/* Active Meeting Room */}
      {activeMeeting && isInMeeting && (
        <MeetingRoom
          meeting={activeMeeting}
          onLeaveMeeting={handleLeaveMeeting}
        />
      )}

      {/* Meeting Notifications */}
      <div className="fixed top-20 right-6 space-y-4 z-40 max-w-md">
        {meetingNotificationsDisplay.map((notification, index) => (
          <div key={index}>
            <MeetingNotification
              meeting={notification.meeting}
              type={notification.type}
              onJoin={() => {
                handleJoinMeeting(notification.meeting);
              }}
              onDismiss={() => {
                setMeetingNotificationsDisplay((prev) =>
                  prev.filter((_, i) => i !== index)
                );
              }}
            />
          </div>
        ))}
      </div>

      {/* Toast Notifications */}
      <div className="fixed bottom-6 right-6 space-y-2 z-[100]">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-300 ${toast.type === 'success' ? 'bg-green-500/90' :
              toast.type === 'error' ? 'bg-red-500/90' :
                'bg-blue-500/90'
              } text-white`}
          >
            {toast.type === 'success' ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : toast.type === 'error' ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2z" clipRule="evenodd" />
              </svg>
            )}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        ))}
      </div>
      {/* Screen Share Room */}
      {(isHosting || isViewing) && showScreenShareRoom && (
        <ScreenShareRoom
          currentUserName={currentUser?.fullName || 'You'}
          onClose={() => setShowScreenShareRoom(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;
