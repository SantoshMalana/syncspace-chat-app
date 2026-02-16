import { useState } from 'react';
import type { User } from '../types';

interface AddPeopleModalProps {
    channel: string;
    onClose: () => void;
    onAdd: (email: string) => void;
    workspaceMembers?: User[];
    channelMembers?: string[];
}

const AddPeopleModal = ({ 
    channel, 
    onClose, 
    onAdd,
    workspaceMembers = [],
    channelMembers = []
}: AddPeopleModalProps) => {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const getInitials = (name: string) => {
        if (!name || typeof name !== 'string') return '??';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const handleAddByEmail = () => {
        setError('');
        
        if (!email.trim()) {
            setError('Please enter an email address');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('Please enter a valid email address');
            return;
        }

        onAdd(email.trim().toLowerCase());
        setEmail('');
        onClose();
    };

    const handleAddFromList = (user: User) => {
        onAdd(user.email);
        onClose();
    };

    // Filter workspace members who are NOT in the channel
    const availableMembers = workspaceMembers.filter(member => {
        const memberId = member._id || member.id;
        const isInChannel = channelMembers.includes(memberId);
        const matchesSearch = searchQuery ? 
            member.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            member.email.toLowerCase().includes(searchQuery.toLowerCase()) : true;
        return !isInChannel && matchesSearch;
    });

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-[#0f0f0f] rounded-2xl w-full max-w-lg border border-[#1f1f1f]">
                {/* Header */}
                <div className="p-6 border-b border-[#1f1f1f] flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-white">Add people to #{channel}</h2>
                        <p className="text-sm text-gray-500 mt-1">#{channel}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-[#1a1a1a] transition-colors text-gray-400 hover:text-white"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Add by Email */}
                    <div>
                        <label className="block text-sm font-medium text-white mb-3">Add by email</label>
                        <input
                            type="email"
                            placeholder="ex. Nathalie, or james@acme.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    handleAddByEmail();
                                }
                            }}
                            className="w-full px-4 py-3 rounded-lg bg-[#1a1a1a] border border-primary/30 text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                        {error && (
                            <p className="text-xs text-red-400 mt-2">{error}</p>
                        )}
                    </div>

                    {/* SyncSpace Info Box */}
                    <div className="p-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-white mb-1">Working with external people?</h4>
                                <p className="text-xs text-gray-400">Simply type their email above to invite them to SyncSpace</p>
                            </div>
                        </div>
                    </div>

                    {/* Add from workspace members */}
                    {availableMembers.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-white mb-3">Or select from workspace</label>
                            <input
                                type="text"
                                placeholder="Search members..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-gray-500 focus:outline-none focus:border-primary mb-3"
                            />
                            <div className="max-h-48 overflow-y-auto space-y-2">
                                {availableMembers.map(member => (
                                    <button
                                        key={member._id || member.id}
                                        onClick={() => handleAddFromList(member)}
                                        className="w-full flex items-center justify-between p-3 bg-[#1a1a1a] rounded-lg hover:bg-[#2a2a2a] transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-white font-semibold">
                                                {getInitials(member.fullName)}
                                            </div>
                                            <div className="text-left">
                                                <p className="text-sm font-medium text-white">{member.fullName}</p>
                                                <p className="text-xs text-gray-500">{member.email}</p>
                                            </div>
                                        </div>
                                        <button className="px-3 py-1 rounded bg-primary/20 text-primary text-sm hover:bg-primary/30 transition-colors">
                                            Add
                                        </button>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-[#1f1f1f] flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 rounded-lg bg-[#1a1a1a] text-gray-300 hover:bg-[#2a2a2a] transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleAddByEmail}
                        disabled={!email.trim()}
                        className="px-6 py-2 rounded-lg bg-gradient-to-r from-primary to-secondary text-white font-medium hover:shadow-lg hover:shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        Add
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddPeopleModal;
