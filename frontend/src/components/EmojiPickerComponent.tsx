import { useRef, useEffect } from 'react';
import EmojiPicker, { Theme } from 'emoji-picker-react';

interface EmojiPickerComponentProps {
    onEmojiSelect: (emoji: string) => void;
    onClose: () => void;
}

const EmojiPickerComponent = ({ onEmojiSelect, onClose }: EmojiPickerComponentProps) => {
    const pickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    return (
        <div ref={pickerRef} className="absolute bottom-full mb-2 z-50">
            <EmojiPicker
                onEmojiClick={(emojiData) => {
                    onEmojiSelect(emojiData.emoji);
                    onClose();
                }}
                theme={Theme.DARK}
                width={350}
                height={400}
            />
        </div>
    );
};

export default EmojiPickerComponent;
