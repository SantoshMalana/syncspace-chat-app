// TypeScript interfaces for SyncSpace

export interface User {
    id: string;
    _id?: string;
    fullName: string;
    email: string;
    avatar?: string;
    status: 'online' | 'away' | 'busy' | 'offline';
    statusMessage?: string;
    workspaces?: string[];
    currentWorkspace?: string;
}

export interface Workspace {
    _id: string;
    name: string;
    slug: string;
    description: string;
    ownerId: string;
    members: WorkspaceMember[];
    channels: string[];
    icon?: string;
    inviteCode?: string;
    createdAt: string;
    updatedAt: string;
    id?: string; // For compatibility
}

export interface WorkspaceMember {
    userId: User | string;
    role: 'owner' | 'admin' | 'member';
    joinedAt: string;
}

export interface Channel {
    _id: string;
    name: string;
    description: string;
    workspaceId: string;
    isPrivate: boolean;
    members: string[];
    createdBy: string;
    topic?: string;
    pinnedMessages?: string[];
    createdAt: string;
    updatedAt: string;
}

export interface Message {
    _id: string;
    content: string;
    senderId: User | string;
    channelId?: string;
    recipientId?: User | string;
    workspaceId: string;
    messageType: 'channel' | 'direct';
    attachments?: Attachment[];
    reactions?: Reaction[];
    threadId?: string;
    replyCount?: number;
    isEdited: boolean;
    editedAt?: string;
    isDeleted: boolean;
    mentions?: string[];
    createdAt: string;
    updatedAt: string;
}

export interface Attachment {
    filename: string;
    url: string;
    fileType: string;
    fileSize: number;
}

export interface Reaction {
    emoji: string;
    userId: string;
    createdAt: string;
}

export interface DirectMessage {
    _id: string;
    participants: User[];
    workspaceId: string;
    lastMessage?: Message;
    lastMessageAt: string;
    unreadCount: UnreadCount[];
    createdAt: string;
    updatedAt: string;
}

export interface UnreadCount {
    userId: string;
    count: number;
}

export interface TypingUser {
    channelId: string;
    userId: string;
    userName: string;
    isTyping: boolean;
}
