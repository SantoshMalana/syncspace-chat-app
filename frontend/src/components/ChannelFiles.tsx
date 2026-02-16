import { useState, useEffect } from 'react';
import { channelAPI } from '../utils/api';

interface FileItem {
    _id: string;
    url: string;
    filename: string;
    fileType: string;
    fileSize: number;
    createdAt: string;
    sender: {
        _id: string;
        fullName: string;
        avatar: string;
    };
    isMedia: boolean;
}

interface ChannelFilesProps {
    channelId: string;
    onClose: () => void;
}

const ChannelFiles = ({ channelId, onClose }: ChannelFilesProps) => {
    const [activeTab, setActiveTab] = useState<'media' | 'files'>('media');
    const [files, setFiles] = useState<FileItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchFiles = async () => {
            setLoading(true);
            try {
                const data: any = await channelAPI.getFiles(channelId, activeTab);
                setFiles(data.files || []);
            } catch (err: any) {
                setError(err.message || 'Failed to load files');
            } finally {
                setLoading(false);
            }
        };

        fetchFiles();
    }, [channelId, activeTab]);

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString();
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-[#0f0f0f] rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-[#1f1f1f]">
                {/* Header */}
                <div className="p-6 border-b border-[#1f1f1f] flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">Media & Files</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-[#1a1a1a] transition-colors text-gray-400 hover:text-white"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-[#1f1f1f]">
                    <button
                        onClick={() => setActiveTab('media')}
                        className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'media'
                                ? 'text-white border-b-2 border-primary'
                                : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        Media
                    </button>
                    <button
                        onClick={() => setActiveTab('files')}
                        className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'files'
                                ? 'text-white border-b-2 border-primary'
                                : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        Files
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center h-40">
                            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : error ? (
                        <div className="text-center text-red-400 py-8">{error}</div>
                    ) : files.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-[#1a1a1a] rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-white mb-1">Currently no files present</h3>
                            <p className="text-sm text-gray-500">Shared {activeTab} will appear here</p>
                        </div>
                    ) : (
                        <div className={activeTab === 'media' ? "grid grid-cols-3 gap-4" : "space-y-2"}>
                            {files.map(file => (
                                activeTab === 'media' ? (
                                    <a
                                        key={file._id}
                                        href={file.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="relative group aspect-square bg-[#1a1a1a] rounded-lg overflow-hidden border border-[#2a2a2a] hover:border-primary/50 transition-all"
                                    >
                                        {file.fileType.startsWith('image/') ? (
                                            <img
                                                src={file.url}
                                                alt={file.filename}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-500">
                                                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                                            <p className="text-xs text-white truncate">{file.filename}</p>
                                            <p className="text-[10px] text-gray-300">by {file.sender.fullName}</p>
                                        </div>
                                    </a>
                                ) : (
                                    <div
                                        key={file._id}
                                        className="flex items-center justify-between p-3 bg-[#1a1a1a] rounded-lg hover:bg-[#202020] transition-colors group"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded bg-[#2a2a2a] flex items-center justify-center text-gray-400">
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-white truncate">{file.filename}</p>
                                                <p className="text-xs text-gray-500">
                                                    {formatFileSize(file.fileSize)} • {formatDate(file.createdAt)} • by {file.sender.fullName}
                                                </p>
                                            </div>
                                        </div>
                                        <a
                                            href={file.url}
                                            download
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 rounded hover:bg-[#333] text-gray-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                        </a>
                                    </div>
                                )
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChannelFiles;
