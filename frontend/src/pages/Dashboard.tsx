import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { workspaceAPI, channelAPI, messageAPI, uploadAPI } from '../utils/api';
import { initializeSocket, getSocket, joinWorkspace, joinChannel, leaveChannel, sendTypingStart, sendTypingStop, disconnectSocket, joinThread, leaveThread } from '../utils/socket';
import type { Workspace, Channel, Message, User, TypingUser } from '../types';
import MessageItem from '../components/MessageItem';
import ThreadPanel from '../components/ThreadPanel';
import DirectMessages from '../components/DirectMessages';
import FileUpload from '../components/FileUpload';
import EmojiPickerComponent from '../components/EmojiPickerComponent';
import MentionAutocomplete from '../components/MentionAutocomplete';
import ProfilePanel from '../components/ProfilePanel';

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
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [showCreateWorkspaceModal, setShowCreateWorkspaceModal] = useState(false);
  const [showJoinWorkspaceModal, setShowJoinWorkspaceModal] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [joinInviteCode, setJoinInviteCode] = useState('');

  // Advanced features state
  const [showThreadPanel, setShowThreadPanel] = useState(false);
  const [activeThread, setActiveThread] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [workspaceMembers, setWorkspaceMembers] = useState<User[]>([]);
  const [showDM, setShowDM] = useState(false); // Kept for logic safety, though rendering logic might have changed
  const [activeDMUser, setActiveDMUser] = useState<User | null>(null);
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const [activeProfileUser, setActiveProfileUser] = useState<User | null>(null);

  // Initialize on mount
  // Initialize on mount
  useEffect(() => {
    initializeApp();
    return () => {
      disconnectSocket();
    };
  }, []);

  const initializeApp = async () => {
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');

      if (!token || !userStr) {
        navigate('/login');
        return;
      }

      const user = JSON.parse(userStr);
      setCurrentUser(user);

      console.log('🔄 Initializing app...');
      console.log('📡 Backend URL:', import.meta.env.VITE_API_URL);

      // Initialize Socket.io
      console.log('🔌 Connecting to Socket.io...');
      const socket = initializeSocket(user.id);
      setupSocketListeners(socket);

      // Fetch workspaces
      console.log('📥 Fetching workspaces...');
      const workspacesData: any = await workspaceAPI.getAll();
      console.log('✅ Workspaces loaded:', workspacesData);

      setWorkspaces(workspacesData.workspaces || []);

      if (workspacesData.workspaces && workspacesData.workspaces.length > 0) {
        const firstWorkspace = workspacesData.workspaces[0];
        setCurrentWorkspace(firstWorkspace);
        joinWorkspace(firstWorkspace._id);

        // Fetch channels
        console.log('📥 Fetching channels...');
        const channelsData: any = await channelAPI.getWorkspaceChannels(firstWorkspace._id);
        console.log('✅ Channels loaded:', channelsData);

        // Initialize first active channel
        if (channelsData.channels && channelsData.channels.length > 0) {
          setActiveChannel(channelsData.channels[0]);
          joinChannel(channelsData.channels[0]._id);
        }
      } else {
        // No workspaces found, prompt to create one
        setShowCreateWorkspaceModal(true);
      }
    } catch (error: any) {
      console.error('Error initializing app:', error);
      if (window.location.pathname !== '/login') {
        // navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkspace = async () => {
    try {
      if (!newWorkspaceName.trim()) return;

      const response: any = await workspaceAPI.create(newWorkspaceName);
      const newWorkspace = response.workspace;

      setWorkspaces([...workspaces, newWorkspace]);
      setCurrentWorkspace(newWorkspace);
      setChannels([]); // New workspace has no channels initially (except maybe general)
      setActiveChannel(null);
      setShowCreateWorkspaceModal(false);
      setNewWorkspaceName('');

      // Refresh channels for new workspace (usually backend creates a 'general' channel)
      const channelsData: any = await channelAPI.getWorkspaceChannels(newWorkspace._id);
      setChannels(channelsData.channels || []);
      if (channelsData.channels?.length > 0) {
        setActiveChannel(channelsData.channels[0]);
        joinChannel(channelsData.channels[0]._id);
      }

    } catch (error) {
      console.error('Error creating workspace:', error);
      alert('Failed to create workspace');
    }
  };

  const handleJoinWorkspace = async () => {
    try {
      if (!joinInviteCode.trim()) return;

      const response: any = await workspaceAPI.join(joinInviteCode);
      const joinedWorkspace = response.workspace;

      // Check if already in list
      if (!workspaces.find(w => w._id === joinedWorkspace._id)) {
        setWorkspaces([...workspaces, joinedWorkspace]);
      }

      handleSwitchWorkspace(joinedWorkspace);
      setShowJoinWorkspaceModal(false);
      setJoinInviteCode('');

    } catch (error) {
      console.error('Error joining workspace:', error);
      alert('Failed to join workspace: Invalid code or already a member');
    }
  };

  const handleSwitchWorkspace = async (workspace: Workspace) => {
    if (activeChannel) {
      leaveChannel(activeChannel._id);
    }

    // Switch in backend (optional, mostly for tracking)
    try {
      await workspaceAPI.switchWorkspace(workspace._id);
    } catch (e) {
      console.warn('Switch workspace API call failed', e);
    }

    setCurrentWorkspace(workspace);
    setShowWorkspaceMenu(false);

    // Fetch channels for new workspace
    try {
      const channelsData: any = await channelAPI.getWorkspaceChannels(workspace._id);
      setChannels(channelsData.channels || []);
      if (channelsData.channels?.length > 0) {
        setActiveChannel(channelsData.channels[0]);
        joinChannel(channelsData.channels[0]._id);
      } else {
        setActiveChannel(null);
      }

      // Fetch members for mentions
      try {
        const membersData: any = await workspaceAPI.getMembers(workspace._id);
        if (membersData && membersData.members && Array.isArray(membersData.members)) {
          setWorkspaceMembers(membersData.members.map((m: any) =>
            typeof m.userId === 'object' ? m.userId : { _id: m.userId, fullName: 'Unknown', email: '' }
          ));
        } else {
          setWorkspaceMembers([]);
        }
      } catch (err) {
        console.warn('Failed to fetch workspace members', err);
        setWorkspaceMembers([]);
      }

    } catch (error) {
      console.error('Error switching workspace:', error);
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
      console.log(`User ${userId} is now ${status}`);
    });

    socket.on('thread:reply', (message: Message) => {
      // Update messages if viewing the thread
      if (showThreadPanel && activeThread?._id === message.threadId) {
        setMessages(prev => [...prev, message]);
      }
    });

    socket.on('reaction:updated', ({ messageId, reaction }: any) => {
      setMessages(prev => prev.map(m =>
        m._id === messageId ? { ...m, reactions: reaction } : m
      ));
    });
  };

  const selectChannel = async (channel: Channel) => {
    if (activeChannel) {
      leaveChannel(activeChannel._id);
    }

    setActiveChannel(channel);
    joinChannel(channel._id);

    try {
      const messagesData: any = await messageAPI.getChannelMessages(channel._id);
      setMessages(messagesData.messages || []);
      scrollToBottom();
    } catch (error) {
      console.error('Error fetching messages:', error);
    }

    // Update workspace members for mentions
    if (currentWorkspace) {
      setWorkspaceMembers(currentWorkspace.members.map((m: any) =>
        typeof m.userId === 'object' ? m.userId : { _id: m.userId, fullName: 'Unknown', email: '' }
      ));
    }
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !activeChannel || !currentWorkspace || !currentUser) return;

    try {
      // Upload files if any
      let attachments: any[] = [];
      if (selectedFiles.length > 0) {
        setUploading(true);
        const uploadResult = await uploadAPI.uploadMultiple(selectedFiles);
        attachments = uploadResult.files;
        setSelectedFiles([]);
        setUploading(false);
      }

      // Extract mentions
      const mentionMatches = messageInput.match(/@(\w+)/g);
      const mentions = mentionMatches ? mentionMatches.map(m => m.substring(1)) : [];

      await messageAPI.sendChannelMessage({
        channelId: activeChannel._id,
        content: messageInput,
        workspaceId: currentWorkspace._id,
        attachments,
        mentions,
      });

      setMessageInput('');
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      sendTypingStop(activeChannel._id, currentUser.id);
    } catch (error) {
      console.error('Error sending message:', error);
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
      console.error('Error creating channel:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    disconnectSocket();
    navigate('/login');
  };

  // Advanced feature handlers
  const handleEditMessage = async (messageId: string, newContent: string) => {
    try {
      await messageAPI.editMessage(messageId, newContent);
    } catch (error) {
      console.error('Error editing message:', error);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await messageAPI.deleteMessage(messageId);
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      await messageAPI.addReaction(messageId, emoji);
    } catch (error) {
      console.error('Error adding reaction:', error);
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
    // Profile panel replaces thread panel on mobile, but can coexist on desktop
    // For simplicity, let's close thread panel if open
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
      console.error('Error sending thread reply:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessageInput(value);

    // Check for @ mentions
    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const textAfterAt = value.substring(lastAtIndex + 1);
      if (!textAfterAt.includes(' ')) {
        setMentionSearch(textAfterAt);
        setShowMentions(true);
        // Calculate position (simplified)
        setMentionPosition({ top: -200, left: 0 });
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }

    // Get cursor position for mentions
    if (e.target) {
      // This is a rough estimation. For production, use a library like 'textarea-caret'
      // or a hidden div to mirror the text and get exact coordinates.
      // For now, we'll just show it above the input.
      setMentionPosition({ top: -250, left: 0 });
    }

    handleTyping();
  };

  const handleMentionSelect = (user: User) => {
    const lastAtIndex = messageInput.lastIndexOf('@');
    const newInput = messageInput.substring(0, lastAtIndex) + `@${user.fullName} `;
    setMessageInput(newInput);
    setShowMentions(false);
  };

  const handleSelectDMConversation = async (userId: string, user: User) => {
    setActiveDMUser(user);
    setShowDM(true);
    // Fetch DM messages
    if (!currentWorkspace) return;
    try {
      const messagesData: any = await messageAPI.getDirectMessages(userId, currentWorkspace._id);
      setMessages(messagesData.messages || []);
    } catch (error) {
      console.error('Error fetching DM messages:', error);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

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

  const activeTypingUsers = typingUsers.filter(u => u.channelId === activeChannel?._id && u.userId !== currentUser?.id);

  return (
    <div className="h-screen flex bg-[#0f0f0f] text-white">

      {/* Workspace Sidebar */}
      <aside className="w-64 bg-[#141414] border-r border-[#1f1f1f] flex flex-col">

        {/* Workspace Header - Dropdown */}
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

          {/* Workspace Menu Dropdown */}
          {showWorkspaceMenu && (
            <div className="absolute top-full left-0 w-full mt-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-xl z-50 overflow-hidden">
              <div className="max-h-60 overflow-y-auto">
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Switch Workspace</div>
                {workspaces.map(ws => (
                  <button
                    key={ws._id || ws.id} // use both for safety
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

          {/* Direct Messages */}
          <div className="flex-1 overflow-hidden">
            {currentUser && (
              <DirectMessages
                currentUser={currentUser}
                workspaceId={currentWorkspace?._id || ''}
                onSelectConversation={handleSelectDMConversation}
                activeConversationUserId={activeDMUser?._id || activeDMUser?.id}
                onShowProfile={handleShowProfile}
              />
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
        {activeChannel && (
          <header className="h-16 bg-[#0a0a0a] border-b border-[#1f1f1f] px-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span className="text-xl">{activeChannel.isPrivate ? '🔒' : '#'}</span>
                {activeChannel.name}
              </h2>
              <p className="text-xs text-gray-500">{activeChannel.description || 'No description'}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">{activeChannel.members?.length || 0} members</span>
            </div>
          </header>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!activeChannel ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-400 mb-2">Welcome to SyncSpace!</h3>
                <p className="text-gray-600">Select a channel to start chatting</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-400 mb-2">No messages yet</h3>
                <p className="text-gray-600">Be the first to send a message in #{activeChannel.name}</p>
              </div>
            </div>
          ) : (
            messages.map((message) => {
              if (!currentUser) return null;
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
        {activeChannel && (
          <div className="p-4 border-t border-[#1f1f1f] relative">
            {/* Mentions Autocomplete */}
            {showMentions && (
              <MentionAutocomplete
                members={workspaceMembers}
                onSelect={handleMentionSelect}
                searchTerm={mentionSearch}
                position={mentionPosition}
              />
            )}

            {/* Emoji Picker */}
            {showEmojiPicker && (
              <EmojiPickerComponent
                onEmojiSelect={(emoji) => setMessageInput(prev => prev + emoji)}
                onClose={() => setShowEmojiPicker(false)}
              />
            )}

            {/* File Upload Preview */}
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
                placeholder={`Message #${activeChannel.name}`}
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
            // Logic to switch to DM with this user
            setShowProfilePanel(false);
            handleSelectDMConversation(userId, activeProfileUser);
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;
