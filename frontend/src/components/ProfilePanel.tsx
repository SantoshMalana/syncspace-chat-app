import { useState, useRef, useEffect } from 'react';
import type { User } from '../types';

interface ProfilePanelProps {
    user: User;
    currentUser: User;
    onClose: () => void;
    onMessage: (userId: string) => void;
    onProfileUpdate?: (updatedUser: User) => void;
}

const ProfilePanel = ({ user, currentUser, onClose, onMessage, onProfileUpdate }: ProfilePanelProps) => {
    const [isEditingOwnProfile, setIsEditingOwnProfile] = useState(false);
    const [editingName, setEditingName] = useState(user.fullName);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadMessage, setUploadMessage] = useState('');
    const [restrictions, setRestrictions] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isOwnProfile = currentUser.id === user.id || currentUser._id === user._id;

    // Preset avatars
    const PRESET_AVATARS = [
        '🧑', '👨', '👩', '🧑‍🦱', '👨‍🦱', '👩‍🦰', '🧑‍🦲', '👨‍🦲', '👩‍🦲',
        '🧔', '👨‍🦰', '👩‍🦱', '🧑‍🦳', '👴', '👵', '🧑‍💼', '👨‍💼'
    ];

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    };

    const getLocalTime = () => {
        return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getAvatarUrl = (avatar: string) => {
        if (avatar.startsWith('http')) return avatar;
        return `${import.meta.env.VITE_API_URL}${avatar}`;
    };

    const fetchRestrictions = async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/profile/restrictions`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const data = await response.json();
            if (response.ok) setRestrictions(data);
        } catch (error) {
            console.error('Failed to fetch restrictions:', error);
        }
    };

    useEffect(() => {
        if (isOwnProfile) {
            fetchRestrictions();
        }
    }, [isOwnProfile]);

    const copyEmail = () => {
        navigator.clipboard.writeText(user.email);
        setUploadMessage('✓ Email copied!');
        setTimeout(() => setUploadMessage(''), 2000);
    };

    const handleNameChange = async () => {
        if (!editingName.trim() || editingName === user.fullName) {
            setIsEditingOwnProfile(false);
            return;
        }

        setIsUploading(true);
        setUploadMessage('Updating name...');

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ fullName: editingName })
            });

            const data = await response.json();
            if (!response.ok) {
                setUploadMessage(`Error: ${data.error}`);
                setTimeout(() => setUploadMessage(''), 3000);
                setIsUploading(false);
                return;
            }

            setUploadMessage('✓ Name updated!');
            onProfileUpdate?.(data.user);
            setTimeout(() => {
                setIsEditingOwnProfile(false);
                setUploadMessage('');
            }, 2000);
            await fetchRestrictions();
        } catch (error) {
            console.error('Name change error:', error);
            setUploadMessage('Error updating name');
            setTimeout(() => setUploadMessage(''), 3000);
        } finally {
            setIsUploading(false);
        }
    };

    const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setUploadMessage('Please select an image file');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setUploadMessage('File size must be less than 5MB');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => setAvatarPreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handleUploadAvatar = async () => {
        if (!avatarPreview || !fileInputRef.current?.files?.[0]) return;

        setIsUploading(true);
        setUploadMessage('Uploading...');

        try {
            const formData = new FormData();
            formData.append('file', fileInputRef.current.files[0]);

            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/uploads/single`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Upload failed');

            const profileResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ avatar: data.file.url })
            });

            const profileData = await profileResponse.json();
            if (!profileResponse.ok) throw new Error(profileData.error || 'Profile update failed');

            setUploadMessage('✓ Avatar updated!');
            setAvatarPreview(null);
            onProfileUpdate?.(profileData.user);
            if (fileInputRef.current) fileInputRef.current.value = '';
            setTimeout(() => setUploadMessage(''), 3000);
            await fetchRestrictions();
        } catch (error) {
            console.error('Avatar upload error:', error);
            setUploadMessage(`Error: ${(error as Error).message}`);
            setTimeout(() => setUploadMessage(''), 3000);
        } finally {
            setIsUploading(false);
        }
    };

    const handlePresetAvatar = async (emoji: string) => {
        setIsUploading(true);
        setUploadMessage('Updating avatar...');

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ avatar: emoji })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed');

            setUploadMessage('✓ Avatar updated!');
            onProfileUpdate?.(data.user);
            setTimeout(() => setUploadMessage(''), 3000);
            await fetchRestrictions();
        } catch (error) {
            console.error('Avatar update error:', error);
            setUploadMessage(`Error: ${(error as Error).message}`);
            setTimeout(() => setUploadMessage(''), 3000);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed right-0 top-0 h-screen w-[380px] bg-[#0f0f0f] border-l border-[#1f1f1f] flex flex-col shadow-2xl z-50">
            {/* Header */}
            <div className="p-4 flex items-center justify-between border-b border-[#1f1f1f]">
                <h3 className="text-lg font-semibold text-white">
                    {isOwnProfile ? 'My Profile' : 'Member Profile'}
                </h3>
                <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-[#1a1a1a] transition-colors text-gray-400 hover:text-white"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                {/* Avatar & Status */}
                <div className="p-6 flex flex-col items-center border-b border-[#1f1f1f]">
                    <div className="relative mb-4">
                        <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-6xl font-bold shadow-lg overflow-hidden">
                            {avatarPreview ? (
                                <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                            ) : user.avatar ? (
                                user.avatar.startsWith('http') ? (
                                    <img src={getAvatarUrl(user.avatar)} alt={user.fullName} className="w-full h-full object-cover" />
                                ) : (
                                    <span>{user.avatar}</span>
                                )
                            ) : (
                                getInitials(user.fullName)
                            )}
                        </div>
                        <div className={`absolute bottom-2 right-2 w-6 h-6 rounded-full border-4 border-[#0f0f0f] ${user.status === 'online' ? 'bg-green-500' : 'bg-gray-500'}`} />

                        {isOwnProfile && (
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className="absolute bottom-0 right-0 bg-primary hover:bg-primary/90 disabled:bg-gray-500 p-2 rounded-full shadow-lg transition-all"
                                title="Change avatar"
                            >
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {/* Hidden file input */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                    />

                    {avatarPreview && isOwnProfile && (
                        <div className="mb-4 w-full flex gap-2">
                            <button
                                onClick={handleUploadAvatar}
                                disabled={isUploading}
                                className="flex-1 py-2 px-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-500 text-white rounded-lg font-medium text-sm transition-all"
                            >
                                ✓ Upload
                            </button>
                            <button
                                onClick={() => {
                                    setAvatarPreview(null);
                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                }}
                                disabled={isUploading}
                                className="flex-1 py-2 px-3 bg-[#1a1a1a] hover:bg-[#2a2a2a] disabled:bg-gray-600 text-white rounded-lg font-medium text-sm border border-[#2a2a2a]"
                            >
                                ✕ Cancel
                            </button>
                        </div>
                    )}

                    {uploadMessage && (
                        <div className={`mb-4 w-full py-2 px-3 rounded-lg text-sm text-center font-medium ${
                            uploadMessage.startsWith('✓')
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : uploadMessage.includes('Error')
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}>
                            {uploadMessage}
                        </div>
                    )}

                    {isEditingOwnProfile ? (
                        <div className="w-full mb-4">
                            <input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                disabled={isUploading}
                                className="w-full px-3 py-2 text-center font-bold text-lg bg-[#1a1a1a] border-2 border-primary rounded-lg text-white focus:outline-none"
                            />
                            {restrictions && !restrictions.canChangeName && (
                                <p className="text-xs text-red-400 mt-2 text-center">
                                    Next change in {restrictions.daysUntilNameChange} day{restrictions.daysUntilNameChange !== 1 ? 's' : ''}
                                </p>
                            )}
                        </div>
                    ) : (
                        <h2 className="text-2xl font-bold text-white mb-2 text-center">{user.fullName}</h2>
                    )}

                    <div className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] mb-3 w-full">
                        <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm text-gray-300 font-mono flex-1 truncate">{user.email}</span>
                        <button
                            onClick={copyEmail}
                            className="p-1 hover:bg-[#2a2a2a] rounded transition-colors flex-shrink-0"
                        >
                            <svg className="w-4 h-4 text-gray-400 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </button>
                    </div>

                    <div className="flex items-center gap-2 text-gray-400">
                        <div className={`w-2 h-2 rounded-full ${user.status === 'online' ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                        <span className="text-sm capitalize">{user.status || 'offline'}</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="p-4 border-b border-[#1f1f1f]">
                    {isOwnProfile ? (
                        <button
                            onClick={() => setIsEditingOwnProfile(!isEditingOwnProfile)}
                            disabled={isUploading}
                            className="w-full py-3 px-4 bg-gradient-to-r from-primary to-secondary hover:shadow-lg hover:shadow-primary/20 disabled:opacity-50 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                        >
                            {isEditingOwnProfile ? '✓ Done Editing' : '✏️ Edit Profile'}
                        </button>
                    ) : (
                        <button
                            onClick={() => onMessage(user._id || user.id)}
                            className="w-full py-3 px-4 bg-gradient-to-r from-primary to-secondary hover:shadow-lg hover:shadow-primary/20 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            Send Message
                        </button>
                    )}
                </div>

                {isEditingOwnProfile && isOwnProfile && (
                    <>
                        <div className="p-4 border-b border-[#1f1f1f]">
                            <button
                                onClick={handleNameChange}
                                disabled={isUploading || editingName === user.fullName || !editingName.trim()}
                                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition-all"
                            >
                                Save Name
                            </button>
                        </div>

                        <div className="p-4 border-b border-[#1f1f1f]">
                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Quick Avatars</h4>
                            <div className="grid grid-cols-6 gap-2">
                                {PRESET_AVATARS.map((emoji, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handlePresetAvatar(emoji)}
                                        disabled={isUploading}
                                        className="text-3xl p-2 rounded-lg hover:bg-[#2a2a2a] transition-all disabled:opacity-50"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {isOwnProfile && restrictions && (
                    <div className="p-4 border-b border-[#1f1f1f]">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Profile Limits</h4>
                        <div className="space-y-2">
                            <div className={`px-3 py-2 rounded-lg text-sm ${restrictions.canChangeName ? 'bg-green-500/10 text-green-400' : 'bg-orange-500/10 text-orange-400'}`}>
                                <div className="font-medium">Name Changes</div>
                                <div className="text-xs">
                                    {restrictions.canChangeName ? 'Available' : `${restrictions.daysUntilNameChange} days remaining`}
                                </div>
                            </div>
                            <div className={`px-3 py-2 rounded-lg text-sm ${restrictions.avatarChangesRemaining > 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                <div className="font-medium">Avatar Changes</div>
                                <div className="text-xs">
                                    {restrictions.avatarChangesRemaining} of {restrictions.totalAvatarChanges} this month
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Details */}
                <div className="p-6 space-y-6">
                    <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Contact</h4>
                        <div className="flex items-start gap-3 p-3 bg-[#1a1a1a] rounded-lg">
                            <div className="p-2 bg-[#0f0f0f] rounded-lg">
                                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-500 mb-1">Email</p>
                                <a href={`mailto:${user.email}`} className="text-sm text-white hover:text-primary break-all">
                                    {user.email}
                                </a>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Current Time</h4>
                        <div className="flex items-center gap-3 p-3 bg-[#1a1a1a] rounded-lg">
                            <div className="p-2 bg-[#0f0f0f] rounded-lg">
                                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Local Time</p>
                                <p className="text-sm text-white font-medium">{getLocalTime()}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePanel;