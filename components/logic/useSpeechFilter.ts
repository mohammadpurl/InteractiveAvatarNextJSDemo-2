import { useCallback, useEffect, useRef } from 'react';
import { useStreamingAvatarContext } from './context';

export const useSpeechFilter = () => {
  const { avatarRef } = useStreamingAvatarContext();
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const SILENCE_THRESHOLD = 1000; // 1 second of silence to consider speech ended

  const handleUserStart = useCallback(() => {
    // Clear any existing silence timer when user starts talking
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const handleUserStop = useCallback(() => {
    // Start a timer when user stops talking
    silenceTimerRef.current = setTimeout(() => {
      if (avatarRef.current) {
        // This will trigger the end of the current speech segment
        avatarRef.current.stopListening();
      }
    }, SILENCE_THRESHOLD);
  }, [avatarRef]);

  useEffect(() => {
    if (!avatarRef.current) return;

    // Add event listeners for user speech events
    avatarRef.current.on('USER_START', handleUserStart);
    avatarRef.current.on('USER_STOP', handleUserStop);

    return () => {
      // Clean up event listeners and timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      avatarRef.current?.off('USER_START', handleUserStart);
      avatarRef.current?.off('USER_STOP', handleUserStop);
    };
  }, [avatarRef, handleUserStart, handleUserStop]);

  return {
    handleUserStart,
    handleUserStop
  };
}; 