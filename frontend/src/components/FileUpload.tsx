import { useState, useRef } from 'react';

interface FileUploadProps {
    onFileSelect: (files: File[]) => void;
    maxFiles?: number;
    maxSizeMB?: number;
}

const FileUpload = ({ onFileSelect, maxFiles = 5, maxSizeMB = 10 }: FileUploadProps) => {
    const [dragActive, setDragActive] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const validateFiles = (files: FileList | null): File[] => {
        if (!files) return [];

        const validFiles: File[] = [];
        const maxSizeBytes = maxSizeMB * 1024 * 1024;

        Array.from(files).forEach(file => {
            if (file.size > maxSizeBytes) {
                alert(`${file.name} is too large. Maximum size is ${maxSizeMB}MB.`);
                return;
            }
            validFiles.push(file);
        });

        return validFiles.slice(0, maxFiles);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const files = validateFiles(e.dataTransfer.files);
        if (files.length > 0) {
            setSelectedFiles(files);
            onFileSelect(files);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = validateFiles(e.target.files);
        if (files.length > 0) {
            setSelectedFiles(files);
            onFileSelect(files);
        }
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const removeFile = (index: number) => {
        const newFiles = selectedFiles.filter((_, i) => i !== index);
        setSelectedFiles(newFiles);
        onFileSelect(newFiles);
    };

    return (
        <div 
            className="relative"
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
        >
            <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleChange}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"
            />

            {selectedFiles.length === 0 ? (
                <button
                    onClick={handleClick}
                    className="p-2 rounded-lg hover:bg-[#1a1a1a] transition-colors text-gray-400 hover:text-white"
                    title="Attach file"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                </button>
            ) : (
                <div className="flex flex-wrap gap-2 p-2 bg-[#1a1a1a] rounded-lg">
                    {selectedFiles.map((file, index) => (
                        <div key={index} className="flex items-center gap-2 bg-[#0a0a0a] px-3 py-2 rounded-lg">
                            <span className="text-sm text-gray-300 truncate max-w-[150px]">{file.name}</span>
                            <button
                                onClick={() => removeFile(index)}
                                className="text-gray-500 hover:text-red-400 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {dragActive && (
                <div
                    className="absolute inset-0 bg-primary/10 border-2 border-primary border-dashed rounded-lg flex items-center justify-center pointer-events-none"
                >
                    <p className="text-primary font-medium">Drop files here</p>
                </div>
            )}
        </div>
    );
};

export default FileUpload;
