// API utility functions for SyncSpace

const API_URL = import.meta.env.VITE_API_URL;

// Get auth token from localStorage
const getAuthToken = (): string | null => {
    return localStorage.getItem('token');
};

// Get auth headers
const getAuthHeaders = (): HeadersInit => {
    const token = getAuthToken();
    return {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
    };
};

// Generic API request handler
async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const url = `${API_URL}${endpoint}`;
    const config: RequestInit = {
        ...options,
        headers: {
            ...getAuthHeaders(),
            ...options.headers,
        },
        credentials: 'include', // ⭐ CRITICAL: This is what was missing!
    };

    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'API request failed');
    }

    return data;
}

// Auth APIs
export const authAPI = {
    login: (email: string, password: string) =>
        apiRequest('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        }),

    signup: (fullName: string, email: string, password: string, workspaceName: string) =>
        apiRequest('/api/auth/signup', {
            method: 'POST',
            body: JSON.stringify({ fullName, email, password, workspaceName }),
        }),

    getMe: () => apiRequest('/api/auth/me'),

    updateProfile: (data: any) =>
        apiRequest('/api/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    logout: () =>
        apiRequest('/api/auth/logout', {
            method: 'POST',
        }),
};

// Workspace APIs
export const workspaceAPI = {
    getAll: () => apiRequest('/api/workspaces'),

    getById: (id: string) => apiRequest(`/api/workspaces/${id}`),

    create: (name: string, description?: string) =>
        apiRequest('/api/workspaces', {
            method: 'POST',
            body: JSON.stringify({ name, description }),
        }),

    update: (id: string, data: any) =>
        apiRequest(`/api/workspaces/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    join: (inviteCode: string) =>
        apiRequest('/api/workspaces/join', {
            method: 'POST',
            body: JSON.stringify({ inviteCode }),
        }),

    switchWorkspace: (id: string) =>
        apiRequest(`/api/workspaces/${id}/switch`, {
            method: 'POST',
        }),

    getMembers: (id: string) => apiRequest(`/api/workspaces/${id}/members`),
};

// Channel APIs
export const channelAPI = {
    getWorkspaceChannels: (workspaceId: string) =>
        apiRequest(`/api/channels/workspace/${workspaceId}`),

    getById: (id: string) => apiRequest(`/api/channels/${id}`),

    create: (data: any) =>
        apiRequest('/api/channels', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    update: (id: string, data: any) =>
        apiRequest(`/api/channels/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    delete: (id: string) =>
        apiRequest(`/api/channels/${id}`, {
            method: 'DELETE',
        }),

    join: (id: string) =>
        apiRequest(`/api/channels/${id}/join`, {
            method: 'POST',
        }),

    leave: (id: string) =>
        apiRequest(`/api/channels/${id}/leave`, {
            method: 'POST',
        }),
};

// Message APIs
export const messageAPI = {
    getChannelMessages: (channelId: string, limit = 50, before?: string) => {
        const params = new URLSearchParams({ limit: limit.toString() });
        if (before) params.append('before', before);
        return apiRequest(`/api/messages/channel/${channelId}?${params}`);
    },

    sendChannelMessage: (data: any) =>
        apiRequest('/api/messages/channel', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    getDirectMessages: (userId: string, workspaceId: string, limit = 50, before?: string) => {
        const params = new URLSearchParams({ workspaceId, limit: limit.toString() });
        if (before) params.append('before', before);
        return apiRequest(`/api/messages/direct/${userId}?${params}`);
    },

    sendDirectMessage: (data: any) =>
        apiRequest('/api/messages/direct', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    getUserConversations: (workspaceId: string) =>
        apiRequest(`/api/messages/conversations/${workspaceId}`),

    editMessage: (id: string, content: string) =>
        apiRequest(`/api/messages/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ content }),
        }),

    deleteMessage: (id: string) =>
        apiRequest(`/api/messages/${id}`, {
            method: 'DELETE',
        }),

    addReaction: (id: string, emoji: string) =>
        apiRequest(`/api/messages/${id}/reaction`, {
            method: 'POST',
            body: JSON.stringify({ emoji }),
        }),

    getThreadReplies: (messageId: string, limit = 50) => {
        const params = new URLSearchParams({ limit: limit.toString() });
        return apiRequest(`/api/messages/thread/${messageId}?${params}`);
    },
};

// Upload APIs
export const uploadAPI = {
    uploadFile: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);

        const token = getAuthToken();
        const response = await fetch(`${API_URL}/api/upload/single`, {
            method: 'POST',
            headers: {
                ...(token && { Authorization: `Bearer ${token}` }),
            },
            credentials: 'include', // ⭐ CRITICAL: Added here too!
            body: formData,
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Upload failed');
        }
        return data;
    },

    uploadMultiple: async (files: File[]) => {
        const formData = new FormData();
        files.forEach(file => formData.append('files', file));

        const token = getAuthToken();
        const response = await fetch(`${API_URL}/api/upload/multiple`, {
            method: 'POST',
            headers: {
                ...(token && { Authorization: `Bearer ${token}` }),
            },
            credentials: 'include', // ⭐ CRITICAL: Added here too!
            body: formData,
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Upload failed');
        }
        return data;
    },
};