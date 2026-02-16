// frontend/src/hooks/useMediaStream.ts

import { useState, useEffect, useRef } from 'react';

interface UseMediaStreamOptions {
  audio?: boolean;
  video?: boolean;
}

export const useMediaStream = (options: UseMediaStreamOptions = { audio: true, video: false }) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  const getMediaStream = async (requestVideo: boolean = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const constraints: MediaStreamConstraints = {
        audio: options.audio ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } : false,
        video: requestVideo ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        } : false,
      };

      console.log('📹 Requesting media stream with constraints:', constraints);
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      console.log('✅ Media stream obtained:', {
        audioTracks: mediaStream.getAudioTracks().length,
        videoTracks: mediaStream.getVideoTracks().length,
      });

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setIsLoading(false);
      return mediaStream;

    } catch (err: any) {
      console.error('❌ Error getting media stream:', err);
      
      let errorMessage = 'Failed to access camera/microphone';
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = 'Camera/microphone access denied. Please allow permissions and try again.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No camera or microphone found on this device.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Camera or microphone is already in use by another application.';
      }

      setError(errorMessage);
      setIsLoading(false);
      return null;
    }
  };

  const stopStream = () => {
    if (streamRef.current) {
      console.log('🛑 Stopping media stream');
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log(`Stopped ${track.kind} track`);
      });
      streamRef.current = null;
      setStream(null);
    }
  };

  const toggleAudio = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        console.log('🎤 Audio toggled:', audioTrack.enabled ? 'ON' : 'OFF');
        return audioTrack.enabled;
      }
    }
    return false;
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        console.log('📹 Video toggled:', videoTrack.enabled ? 'ON' : 'OFF');
        return videoTrack.enabled;
      }
    }
    return false;
  };

  const isAudioEnabled = (): boolean => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      return audioTrack ? audioTrack.enabled : false;
    }
    return false;
  };

  const isVideoEnabled = (): boolean => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      return videoTrack ? videoTrack.enabled : false;
    }
    return false;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
    };
  }, []);

  return {
    stream,
    error,
    isLoading,
    getMediaStream,
    stopStream,
    toggleAudio,
    toggleVideo,
    isAudioEnabled,
    isVideoEnabled,
  };
};