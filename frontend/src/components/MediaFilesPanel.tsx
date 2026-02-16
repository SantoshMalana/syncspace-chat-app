import React, { useMemo } from 'react';
import type { Message } from '../types';

interface MediaFilesPanelProps {
    messages: Message[];
    onClose: () => void;
}

export const MediaFilesPanel = ({ messages, onClose }: MediaFilesPanelProps) => {
    const { mediaMessages, fileMessages, linkMessages } = useMemo(() => {
        const media: Message[] = [];
        const files: Message[] = [];
        const links: Message[] = [];

        messages.forEach(msg => {
            if (msg.attachments && msg.attachments.length > 0) {
                msg.attachments.forEach(att => {
                    const isImage = att.fileType?.startsWith('image/');
                    const isVideo = att.fileType?.startsWith('video/');
                    const isAudio = att.fileType?.startsWith('audio/');
                    
                    if (isImage || isVideo || isAudio) {
                        media.push(msg);
                    } else {
                        files.push(msg);
                    }
                });
            }
            
            // Check for links in content
            if (msg.content && msg.content.match(/https?:\/\/[^\s]+/g)) {
                links.push(msg);
            }
        });

        return { mediaMessages: media, fileMessages: files, linkMessages: links };
    }, [messages]);

    const [activeTab, setActiveTab] = React.useState<'media' | 'files' | 'links'>('media');

    const renderContent = () => {
        switch (activeTab) {
            case 'media':
                return renderMediaTab();
            case 'files':
                return renderFilesTab();
            case 'links':
                return renderLinksTab();
        }
    };

    const renderMediaTab = () => {
        if (mediaMessages.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
                    <svg className="w-12 h-12 mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-center">No media shared yet</p>
                </div>
            );
        }

        return (
            <div className="grid grid-cols-3 gap-2 p-3">
                {mediaMessages.map((msg) =>
                    msg.attachments?.map((att, idx) => {
                        const isImage = att.fileType?.startsWith('image/');
                        const isVideo = att.fileType?.startsWith('video/');

                        return (
                            <div key={`${msg._id}-${idx}`} className="relative bg-[#0a0a0a] rounded-lg overflow-hidden group cursor-pointer aspect-square">
                                {isImage && (
                                    <img
                                        src={att.url}
                                        alt={att.filename}
                                        className="w-full h-full object-cover group-hover:opacity-75 transition-opacity"
                                    />
                                )}
                                {isVideo && (
                                    <video
                                        src={att.url}
                                        className="w-full h-full object-cover group-hover:opacity-75 transition-opacity"
                                    />
                                )}
                                {!isImage && !isVideo && (
                                    <div className="w-full h-full flex items-center justify-center bg-[#1a1a1a]">
                                        <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                )}
                                <a
                                    href={att.url}
                                    download={att.filename}
                                    className="absolute top-2 right-2 bg-black/70 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Download"
                                >
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                </a>
                            </div>
                        );
                    })
                )}
            </div>
        );
    };

    const renderFilesTab = () => {
        if (fileMessages.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
                    <svg className="w-12 h-12 mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-center">No files shared yet</p>
                </div>
            );
        }

        return (
            <div className="space-y-2 p-3 overflow-y-auto">
                {fileMessages.map((msg) =>
                    msg.attachments?.map((att, idx) => (
                        <a
                            key={`${msg._id}-${idx}`}
                            href={att.url}
                            download={att.filename}
                            className="flex items-center gap-3 p-3 bg-[#1a1a1a] rounded-lg hover:bg-[#2a2a2a] transition-colors group"
                        >
                            <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-white truncate group-hover:text-primary transition-colors">{att.filename}</p>
                                <p className="text-xs text-gray-500">
                                    {(att.fileSize / 1024).toFixed(1)} KB
                                </p>
                            </div>
                            <svg className="w-4 h-4 text-gray-500 group-hover:text-primary transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                        </a>
                    ))
                )}
            </div>
        );
    };

    const renderLinksTab = () => {
        if (linkMessages.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
                    <svg className="w-12 h-12 mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.658 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <p className="text-center">No links shared yet</p>
                </div>
            );
        }

        return (
            <div className="space-y-2 p-3 overflow-y-auto">
                {linkMessages.map((msg) => {
                    const links = msg.content.match(/https?:\/\/[^\s]+/g) || [];
                    return links.map((link, idx) => (
                        <a
                            key={`${msg._id}-${idx}`}
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 bg-[#1a1a1a] rounded-lg hover:bg-[#2a2a2a] transition-colors group"
                        >
                            <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.658 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-white truncate group-hover:text-primary transition-colors">{link}</p>
                            </div>
                            <svg className="w-4 h-4 text-gray-500 group-hover:text-primary transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </a>
                    ));
                })}
            </div>
        );
    };

    return (
        <div className="fixed right-0 top-16 h-[calc(100vh-64px)] w-80 bg-[#0f0f0f] border-l border-[#1f1f1f] flex flex-col z-40 slide-in-from-right animate-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#1f1f1f]">
                <h3 className="text-lg font-semibold text-white">Media & Files</h3>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[#1f1f1f]">
                {[
                    { id: 'media', label: 'Media', icon: '🖼️' },
                    { id: 'files', label: 'Files', icon: '📄' },
                    { id: 'links', label: 'Links', icon: '🔗' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as 'media' | 'files' | 'links')}
                        className={`flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                            activeTab === tab.id
                                ? 'text-primary border-primary'
                                : 'text-gray-400 border-transparent hover:text-gray-300'
                        }`}
                    >
                        <span className="mr-2">{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {renderContent()}
            </div>
        </div>
    );
};
