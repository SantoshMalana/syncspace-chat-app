import { useState, useRef, useEffect } from 'react';
import type { User } from '../types';

interface MentionAutocompleteProps {
    members: User[];
    onSelect: (user: User) => void;
    searchTerm: string;
    position: { top: number; left: number };
}

const MentionAutocomplete = ({ members, onSelect, searchTerm, position }: MentionAutocompleteProps) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const listRef = useRef<HTMLDivElement>(null);

    const filteredMembers = members.filter(member =>
        member.fullName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        setSelectedIndex(0);
    }, [searchTerm]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => Math.min(prev + 1, filteredMembers.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => Math.max(prev - 1, 0));
            } else if (e.key === 'Enter' && filteredMembers.length > 0) {
                e.preventDefault();
                onSelect(filteredMembers[selectedIndex]);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [selectedIndex, filteredMembers, onSelect]);

    if (filteredMembers.length === 0) return null;

    return (
        <div
            ref={listRef}
            className="absolute bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-xl max-h-60 overflow-y-auto z-50"
            style={{ top: position.top, left: position.left }}
        >
            {filteredMembers.map((member, index) => (
                <button
                    key={member.id || member._id}
                    onClick={() => onSelect(member)}
                    className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-[#2a2a2a] transition-colors ${index === selectedIndex ? 'bg-[#2a2a2a]' : ''
                        }`}
                >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-sm font-semibold">
                        {member.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </div>
                    <div className="text-left">
                        <p className="text-sm font-medium text-white">{member.fullName}</p>
                        <p className="text-xs text-gray-500">{member.email}</p>
                    </div>
                </button>
            ))}
        </div>
    );
};

export default MentionAutocomplete;
