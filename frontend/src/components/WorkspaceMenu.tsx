import React, { useState } from 'react';

interface WorkspaceMenuProps {
  workspaceName: string;
  onClose: () => void;
  onCreateChannel?: () => void;
  onBrowseTemplates?: () => void;
  onInvitePeople?: () => void;
  onSettings?: () => void;
}

const WorkspaceMenu: React.FC<WorkspaceMenuProps> = ({
  onClose,
  onBrowseTemplates,
  onInvitePeople,
  onSettings,
}) => {
  const [expanded, setExpanded] = useState<string | null>(null);

  const sections = [
    {
      id: 'browse',
      title: 'Browse',
      items: [
        {
          id: 'workspace',
          icon: '📋',
          label: 'Browse this workspace',
          description: 'See public channels and people',
          action: () => {},
        },
        {
          id: 'templates',
          icon: '📁',
          label: 'Start from a template',
          description: 'Browse channel templates',
          action: onBrowseTemplates,
        },
      ],
    },
    {
      id: 'invite',
      title: 'Invite',
      items: [
        {
          id: 'invite',
          icon: '👥',
          label: 'Invite your external partners',
          description: 'Add clients or customers',
          action: onInvitePeople,
        },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-start z-50 p-4">
      <div
        className="absolute inset-0"
        onClick={onClose}
      />

      {/* Menu Panel */}
      <div className="relative bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl shadow-2xl w-full max-w-2xl mt-2 ml-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
          {/* Left: Sections */}
          <div className="md:col-span-1 border-r border-[#2a2a2a] p-4 space-y-2">
            {sections.map((section) => (
              <div key={section.id}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">
                  {section.title}
                </p>
                {section.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                      expanded === item.id
                        ? 'bg-[#2a2a2a] text-white'
                        : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ))}

            <div className="border-t border-[#2a2a2a] pt-2 mt-2">
              <button
                onClick={onSettings}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#2a2a2a] transition-colors text-sm font-medium text-gray-400 hover:text-white"
              >
                Settings
              </button>
            </div>
          </div>

          {/* Right: Content */}
          <div className="md:col-span-2 p-6 space-y-4">
            {sections.map((section) =>
              section.items.map((item) =>
                expanded === item.id ? (
                  <div key={item.id}>
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <span className="text-2xl">{item.icon}</span>
                      {item.label}
                    </h3>
                    <p className="text-gray-400 text-sm mb-4">{item.description}</p>

                    <div className="grid grid-cols-1 gap-3">
                      {item.id === 'templates' && (
                        <>
                          <div className="p-4 bg-[#0f0f0f] rounded-lg border border-[#2a2a2a] hover:border-[#3a3a3a] cursor-pointer transition-all">
                            <h4 className="font-semibold text-white mb-1">✓ Customer Onboarding</h4>
                            <p className="text-xs text-gray-500">Set up channels for customer success</p>
                          </div>
                          <div className="p-4 bg-[#0f0f0f] rounded-lg border border-[#2a2a2a] hover:border-[#3a3a3a] cursor-pointer transition-all">
                            <h4 className="font-semibold text-white mb-1">✓ Project Planning</h4>
                            <p className="text-xs text-gray-500">Organize your project workflow</p>
                          </div>
                          <div className="p-4 bg-[#0f0f0f] rounded-lg border border-[#2a2a2a] hover:border-[#3a3a3a] cursor-pointer transition-all">
                            <h4 className="font-semibold text-white mb-1">✓ Team Huddle</h4>
                            <p className="text-xs text-gray-500">Daily standups and check-ins</p>
                          </div>
                        </>
                      )}

                      {item.id === 'invite' && (
                        <button
                          onClick={() => {
                            item.action?.();
                            onClose();
                          }}
                          className="px-4 py-3 bg-gradient-to-r from-primary to-secondary hover:shadow-lg hover:shadow-primary/20 text-white rounded-lg font-medium transition-all"
                        >
                          Send Invite
                        </button>
                      )}
                    </div>
                  </div>
                ) : null
              )
            )}

            {!expanded && (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">👈</div>
                <p className="text-gray-400 text-sm">Select an option to continue</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceMenu;
