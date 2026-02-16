// TypeScript interfaces for SyncSpace

export interface User {
    id: string;
    _id?: string;
    fullName: string;
    email: string;
    avatar?: string;
    avatarFrame?: string; // New field
    status: 'online' | 'away' | 'busy' | 'offline';
    statusMessage?: string;
    workspaces?: string[];
    currentWorkspace?: string;
}

export interface Workspace {
    _id: string;
    name: string;
    slug: string;
    ownerId: string;
    inviteCode: string;
    members: { userId: string | User; role: string; joinedAt: string }[];
    createdAt: string;
    updatedAt: string;
}

export interface Channel {
    _id: string;
    name: string;
    description?: string;
    topic?: string;
    workspaceId: string;
    isPrivate: boolean;
    members: string[];
    admins?: string[];
    createdBy?: string;
    allowMessagingByRole?: 'all' | 'admin' | 'moderator';
    isArchived?: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ReadReceipt {
    userId: string | User;
    readAt: string;
}

export interface Report {
    userId: string;
    reason: string;
    reportedAt: string;
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
    readBy?: ReadReceipt[]; // New field
    reports?: Report[]; // New field
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
