import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { workspaceAPI, channelAPI, messageAPI, uploadAPI } from '../utils/api';
import { initializeSocket, joinWorkspace, joinChannel, leaveChannel, sendTypingStart, sendTypingStop, disconnectSocket, joinThread, leaveThread } from '../utils/socket';
import type { Workspace, Channel, Message, User, TypingUser } from '../types';
import MessageItem from '../components/MessageItem';
import ThreadPanel from '../components/ThreadPanel';
import FileUpload from '../components/FileUpload';
import EmojiPickerComponent from '../components/EmojiPickerComponent';
import MentionAutocomplete from '../components/MentionAutocomplete';
import ProfilePanel from '../components/ProfilePanel';
import ChannelSettings from '../components/ChannelSettings';

const Dashboard = () => {
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);

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
  const [inviteLink, setInviteLink] = useState('');

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

  // Initialize on mount
  useEffect(() => {
    initializeApp();
    return () => {
      disconnectSocket();
    };
  }, []);

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

      setCurrentWorkspace(firstWorkspace);
      joinWorkspace(firstWorkspace._id);

      // Generate invite link
      setInviteLink(firstWorkspace.inviteCode);

      // Fetch workspace members
      await fetchWorkspaceMembers(firstWorkspace._id);

      // Fetch channels
      await fetchChannelsForWorkspace(firstWorkspace._id);

      // Fetch DM conversations
      await fetchDMConversations(firstWorkspace._id);

      setLoading(false);

    } catch (error: any) {
      console.error('❌ Error initializing app:', error);
      setError(error.message || 'Failed to initialize app');
      setLoading(false);
    }
  };

  const fetchWorkspaceMembers = async (workspaceId: string) => {
    try {
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
      setInviteLink(newWorkspace.inviteCode);

      await fetchWorkspaceMembers(newWorkspace._id);
      await fetchChannelsForWorkspace(newWorkspace._id);
      await fetchDMConversations(newWorkspace._id);

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

      await workspaceAPI.switchWorkspace(workspace._id);
      setCurrentWorkspace(workspace);
      setShowWorkspaceMenu(false);
      setMessages([]);
      setActiveChannel(null);
      setInviteLink(workspace.inviteCode);

      joinWorkspace(workspace._id);

      await fetchWorkspaceMembers(workspace._id);
      await fetchChannelsForWorkspace(workspace._id);
      await fetchDMConversations(workspace._id);

    } catch (error: any) {
      console.error('❌ Error switching workspace:', error);
      alert(error.message || 'Failed to switch workspace');
    }
  };

  const setupSocketListeners = (socket: any) => {
    socket.on('message:new', (message: Message) => {
      setMessages(prev => [...prev, message]);
      scrollToBottom();
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
        (m._id === userId || m.id === userId) ? { ...m, status } : m
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

    try {
      const messagesData: any = await messageAPI.getChannelMessages(channel._id);
      setMessages(messagesData.messages || []);
      scrollToBottom();
    } catch (error) {
      console.error('❌ Error fetching messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !currentWorkspace || !currentUser) return;
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

  // Mark messages as read when viewing channel
  useEffect(() => {
    if ((activeChannel || activeDMUser) && messages.length > 0) {
      const unreadMessages = messages.filter(msg => {
        const isOwn = typeof msg.senderId === 'object' ? msg.senderId._id === currentUser?.id : msg.senderId === currentUser?.id;
        if (isOwn) return false;
        const readBy = msg.readBy || [];
        const isRead = readBy.some(r => typeof r.userId === 'string' ? r.userId === currentUser?.id : r.userId._id === currentUser?.id);
        return !isRead;
      });

      unreadMessages.forEach(msg => {
        messageAPI.markAsRead(msg._id).catch(console.error);
      });
    }
  }, [activeChannel, activeDMUser, messages, currentUser]);

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

  const copyInviteLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      alert('Invite code copied to clipboard!');
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

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const getInitials = (name: string) => {
  if (!name || typeof name !== 'string') return '??';
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
};

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

      {/* Workspace Sidebar */}
      <aside className="w-64 bg-[#141414] border-r border-[#1f1f1f] flex flex-col">

        {/* Workspace Header */}
        <div className="p-4 border-b border-[#1f1f1f] relative">
          <button
            onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
            className="w-full flex items-center justify-between hover:bg-[#1f1f1f] p-2 -ml-2 rounded-lg transition-colors group"
          >
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent text-left">
                {currentWorkspace?.name || 'SyncSpace'}
              </h1>
              <p className="text-xs text-gray-500 mt-1 text-left">{currentUser?.fullName}</p>
            </div>
            <svg className={`w-5 h-5 text-gray-500 group-hover:text-white transition-transform ${showWorkspaceMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Workspace Menu */}
          {showWorkspaceMenu && (
            <div className="absolute top-full left-0 w-full mt-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-xl z-50 overflow-hidden">
              <div className="max-h-60 overflow-y-auto">
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Switch Workspace</div>
                {workspaces.map(ws => (
                  <button
                    key={ws._id || ws.id}
                    onClick={() => handleSwitchWorkspace(ws)}
                    className={`w-full text-left px-4 py-3 hover:bg-[#2a2a2a] transition-colors flex items-center justify-between ${currentWorkspace?._id === ws._id ? 'text-primary' : 'text-gray-300'}`}
                  >
                    <span className="truncate">{ws.name}</span>
                    {currentWorkspace?._id === ws._id && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
              <div className="border-t border-[#2a2a2a] p-2 space-y-1">
                <button
                  onClick={() => { setShowInviteModal(true); setShowWorkspaceMenu(false); }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-[#2a2a2a] hover:text-white rounded-md flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Invite Members
                </button>
                <button
                  onClick={() => { setShowCreateWorkspaceModal(true); setShowWorkspaceMenu(false); }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-[#2a2a2a] hover:text-white rounded-md flex items-center gap-2"
                >
                  <div className="w-5 h-5 rounded-full border border-gray-500 flex items-center justify-center">+</div>
                  Create Workspace
                </button>
                <button
                  onClick={() => { setShowJoinWorkspaceModal(true); setShowWorkspaceMenu(false); }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-[#2a2a2a] hover:text-white rounded-md flex items-center gap-2"
                >
                  <div className="w-5 h-5 rounded-full border border-gray-500 flex items-center justify-center">#</div>
                  Join Workspace
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Channels Section */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-400">Channels</h3>
              <button
                onClick={() => setShowCreateChannel(true)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            <div className="space-y-1">
              {channels.map(channel => (
                <button
                  key={channel._id}
                  onClick={() => selectChannel(channel)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all ${activeChannel?._id === channel._id
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-400 hover:bg-[#1a1a1a] hover:text-white'
                    }`}
                >
                  <span className="text-lg">{channel.isPrivate ? '🔒' : '#'}</span>
                  <span className="text-sm font-medium truncate">{channel.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Direct Messages with Search */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-400">Direct Messages</h3>
              <button
                onClick={() => setShowUserSearch(!showUserSearch)}
                className="text-gray-400 hover:text-white transition-colors"
                title="Search users to message"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>

            {/* User Search Input */}
            {showUserSearch && (
              <div className="mb-3">
                <input
                  type="text"
                  placeholder="Search members..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 bg-[#1a1a1a] text-white text-sm rounded-lg border border-[#2a2a2a] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  autoFocus
                />
              </div>
            )}

            {/* DM List */}
            <div className="space-y-1">
              {(showUserSearch && userSearchQuery ? filteredMembers : dmConversations.slice(0, 8)).map((item: any) => {
                const user = item.userId || item;
                // Skip if user is current user
                const isCurrentUserCheck = (user._id === currentUser?._id) || (user.id === currentUser?.id);
                if (isCurrentUserCheck) return null;
                return (
                <button
                    key={user._id || user.id}
                    onClick={() => handleSelectDMUser(user)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all ${(activeDMUser?._id === user._id || activeDMUser?.id === user.id)
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-400 hover:bg-[#1a1a1a] hover:text-white'
                      }`}
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-white font-semibold text-xs">
                        {getInitials(user.fullName)}
                      </div>
                      {user.status === 'online' && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-[#141414] rounded-full"></div>
                      )}
                    </div>
                    <span className="text-sm font-medium truncate">{user.fullName}</span>
                  </button>
                );
              })}
            </div>

            {showUserSearch && userSearchQuery && filteredMembers.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No members found</p>
            )}
          </div>
        </div>

        {/* User Profile */}
        <div className="p-4 border-t border-[#1f1f1f]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-semibold flex-shrink-0">
              {currentUser ? getInitials(currentUser.fullName) : '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{currentUser?.fullName}</p>
              <p className="text-xs text-gray-500 truncate">{currentUser?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col">

        {/* Channel Header */}
        {(activeChannel || showDM) && (
          <header className="h-16 bg-[#0a0a0a] border-b border-[#1f1f1f] px-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                {showDM && activeDMUser ? (
                  <>
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-xs">
                      {getInitials(activeDMUser.fullName)}
                    </div>
                    <span>{activeDMUser.fullName}</span>
                  </>
                ) : activeChannel ? (
                  <>
                    <span className="text-xl">{activeChannel.isPrivate ? '🔒' : '#'}</span>
                    <span>{activeChannel.name}</span>
                  </>
                ) : null}
              </h2>
              {activeChannel && (
                <p className="text-xs text-gray-500">{activeChannel.description || 'No description'}</p>
              )}
            </div>
            {activeChannel && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">{activeChannel.members?.length || 0} members</span>
                <button
                  onClick={() => handleOpenChannelSettings(activeChannel)}
                  className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors"
                  title="Channel settings"
                >
                  <svg className="w-5 h-5 text-gray-400 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </div>
            )}
          </header>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
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
            messages.map((message) => {
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
                />
              );
            })
          )}

          {/* Typing Indicator */}
          {activeTypingUsers.length > 0 && activeTypingUsers[0] && (
            <div className="flex items-center gap-2 text-sm text-gray-500 italic">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
              <span>{activeTypingUsers[0].userName} is typing...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
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
                disabled={!messageInput.trim()}
                className="px-6 py-3 rounded-lg bg-gradient-to-r from-primary to-secondary text-white font-medium hover:shadow-lg hover:shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Send
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Invite Members Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1a] p-6 rounded-2xl w-full max-w-md border border-[#2a2a2a]">
            <h2 className="text-xl font-bold text-white mb-4">Invite Members to {currentWorkspace?.name}</h2>
            <p className="text-gray-400 text-sm mb-4">Share this invite code with people you want to join your workspace:</p>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={inviteLink}
                readOnly
                className="flex-1 px-4 py-3 rounded-lg bg-[#0f0f0f] border border-[#2a2a2a] text-white focus:outline-none"
              />
              <button
                onClick={copyInviteLink}
                className="px-6 py-3 rounded-lg bg-gradient-to-r from-primary to-secondary text-white font-medium hover:shadow-lg hover:shadow-primary/20 transition-all"
              >
                Copy
              </button>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
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
          onMessage={(userId) => {
            setShowProfilePanel(false);
            handleSelectDMUser(activeProfileUser);
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
          onDeleteChannel={handleDeleteChannel}
          isAdmin={isWorkspaceAdmin}
        />
      )}
    </div>
  );
};

export default Dashboard;
