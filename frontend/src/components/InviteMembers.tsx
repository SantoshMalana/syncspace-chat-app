import { useState } from 'react';
import type { Workspace } from '../types';

interface InviteMembersProps {
  workspace: Workspace | null;
  onClose: () => void;
  onMemberInvited: (message: string) => void;
  workspaceMembers: any[];
}

const InviteMembers = ({ workspace, onClose, onMemberInvited, workspaceMembers }: InviteMembersProps) => {
  const [inviteMethod, setInviteMethod] = useState<'email' | 'code'>('email');
  const [emailInput, setEmailInput] = useState('');
  const [userIdInput, setUserIdInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);

  if (!workspace) return null;

  const handleInviteByEmail = async () => {
    setError('');
    setSuccess('');

    if (!emailInput.trim()) {
      setError('Please enter an email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailInput)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/workspaces/${workspace._id}/invite-by-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: emailInput.toLowerCase().trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to invite member');
      }

      setSuccess(`✅ ${emailInput} has been invited to ${workspace.name}`);
      setEmailInput('');
      onMemberInvited(data.message || 'Member invited successfully');
      
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to invite member');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteByUserId = async () => {
    setError('');
    setSuccess('');

    if (!userIdInput.trim()) {
      setError('Please enter a user ID');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/workspaces/${workspace._id}/invite-by-id`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: userIdInput.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to invite member');
      }

      setSuccess(`✅ User has been invited to ${workspace.name}`);
      setUserIdInput('');
      onMemberInvited(data.message || 'Member invited successfully');
      
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to invite member');
    } finally {
      setLoading(false);
    }
  };

  const copyInviteLink = () => {
    const inviteLink = `${window.location.origin}/join/${workspace.inviteCode}`;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl max-w-2xl w-full shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#2a2a2a]">
          <div>
            <h2 className="text-2xl font-bold text-white">Invite Members</h2>
            <p className="text-gray-400 text-sm mt-1">Add people to {workspace.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Tabs */}
          <div className="flex gap-2 border-b border-[#2a2a2a]">
            <button
              onClick={() => { setInviteMethod('email'); setError(''); }}
              className={`px-4 py-3 font-medium transition-all border-b-2 ${
                inviteMethod === 'email'
                  ? 'text-primary border-primary'
                  : 'text-gray-400 border-transparent hover:text-white'
              }`}
            >
              <svg className="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
              By Email
            </button>
            <button
              onClick={() => { setInviteMethod('code'); setError(''); }}
              className={`px-4 py-3 font-medium transition-all border-b-2 ${
                inviteMethod === 'code'
                  ? 'text-primary border-primary'
                  : 'text-gray-400 border-transparent hover:text-white'
              }`}
            >
              <svg className="w-4 h-4 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 7H7v6h6V7z" />
              </svg>
              Invite Link
            </button>
          </div>

          {error && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
              {success}
            </div>
          )}

          {inviteMethod === 'email' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="colleague@company.com"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && emailInput) {
                      handleInviteByEmail();
                    }
                  }}
                  className="w-full px-4 py-3 rounded-lg bg-[#0f0f0f] border border-[#2a2a2a] text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <p className="text-xs text-gray-500 mt-2">The user must already have a SyncSpace account</p>
              </div>

              {/* Show workspace members to select from */}
              {workspaceMembers.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Or select from members</label>
                  <div className="max-h-48 overflow-y-auto space-y-2 bg-[#0f0f0f] rounded-lg p-3 border border-[#2a2a2a]">
                    {workspaceMembers.map((member) => (
                      <button
                        key={member._id || member.id}
                        onClick={() => {
                          setEmailInput(member.email);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#1a1a1a] transition-colors flex items-center gap-3"
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-xs font-bold text-white">
                          {member.fullName?.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{member.fullName}</p>
                          <p className="text-xs text-gray-500 truncate">{member.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleInviteByEmail}
                disabled={loading || !emailInput.trim()}
                className="w-full py-3 rounded-lg bg-gradient-to-r from-primary to-secondary text-white font-semibold hover:shadow-lg hover:shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Sending invite...' : 'Send Invite'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Invite Link</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={`${window.location.origin}/join/${workspace.inviteCode}`}
                    readOnly
                    className="flex-1 px-4 py-3 rounded-lg bg-[#0f0f0f] border border-[#2a2a2a] text-white focus:outline-none font-mono text-sm"
                  />
                  <button
                    onClick={copyInviteLink}
                    className="px-6 py-3 rounded-lg bg-primary text-white font-medium hover:bg-primary/80 transition-all"
                  >
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">Share this link with anyone to invite them to your workspace</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Or invite by User ID</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={userIdInput}
                    onChange={(e) => setUserIdInput(e.target.value)}
                    placeholder="Paste user ID here"
                    className="flex-1 px-4 py-3 rounded-lg bg-[#0f0f0f] border border-[#2a2a2a] text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                  <button
                    onClick={handleInviteByUserId}
                    disabled={loading || !userIdInput.trim()}
                    className="px-6 py-3 rounded-lg bg-secondary text-white font-medium hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {loading ? 'Adding...' : 'Add'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-[#2a2a2a]">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#2a2a2a] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default InviteMembers;
