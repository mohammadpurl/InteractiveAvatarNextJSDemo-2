import { useCallback, useEffect, useRef } from "react";
import { StreamingEvents } from "@heygen/streaming-avatar";

import { useStreamingAvatarContext } from "./context";


export const useAudioFilter = () => {
  const { avatarRef } = useStreamingAvatarContext();
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null); // To store the microphone stream
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const isFilteringRef = useRef<boolean>(false);

  const SPEECH_FREQUENCY_RANGE = {
    min: 85, // Hz (for fundamental frequency)
    max: 8000, // Hz (Adjusted to cover a wider range of speech harmonics and consonants)
  };

  const isMusic = useCallback((frequencyData: Uint8Array): boolean => {
    const bufferLength = analyserRef.current?.frequencyBinCount || 0;
    if (bufferLength === 0) return false;

    const sampleRate = audioContextRef.current?.sampleRate || 44100;
    const maxFrequency = sampleRate / 2;
    const frequencyBinWidth = maxFrequency / bufferLength;

    let speechEnergy = 0;
    let totalEnergy = 0;

    for (let i = 0; i < bufferLength; i++) {
      const frequency = i * frequencyBinWidth;
      const amplitude = frequencyData[i]; // Amplitude/power for this frequency bin
      totalEnergy += amplitude;

      if (
        frequency >= SPEECH_FREQUENCY_RANGE.min &&
        frequency <= SPEECH_FREQUENCY_RANGE.max
      ) {
        speechEnergy += amplitude;
      }
    }

    const MIN_TOTAL_ENERGY_THRESHOLD = 500; // Drastically decreased threshold to catch even quiet background sounds
    const SPEECH_ENERGY_RATIO_THRESHOLD = 0.2; // If speech energy is less than 20% of total, it's likely non-speech

    if (totalEnergy < MIN_TOTAL_ENERGY_THRESHOLD) {
      return false;
    }

    return speechEnergy < totalEnergy * SPEECH_ENERGY_RATIO_THRESHOLD;
  }, []);

  const startFiltering = useCallback(async () => {
    if (isFilteringRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      if (!analyserRef.current) {
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 2048;
      }

      if (!sourceRef.current) {
        sourceRef.current =
          audioContextRef.current.createMediaStreamSource(stream);
        sourceRef.current.connect(analyserRef.current);
      }

      isFilteringRef.current = true;

      const frequencyData = new Uint8Array(
        analyserRef.current?.frequencyBinCount || 0,
      );

      const checkAudio = () => {
        if (!isFilteringRef.current || !analyserRef.current) return;

        analyserRef.current.getByteFrequencyData(frequencyData);

        if (isMusic(frequencyData)) {
          if (avatarRef.current) {
            avatarRef.current.muteInputAudio();
          }
        } else {
          if (avatarRef.current) {
            avatarRef.current.unmuteInputAudio();
          }
        }

        requestAnimationFrame(checkAudio);
      };

      checkAudio();
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  }, [isMusic, avatarRef]);

  const stopFiltering = useCallback(() => {
    isFilteringRef.current = false;

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (avatarRef.current) {
      avatarRef.current.unmuteInputAudio();
    }
  }, [avatarRef]);

  useEffect(() => {
    return () => {
      stopFiltering();
    };
  }, [stopFiltering]);

  return {
    startFiltering,
    stopFiltering,
  };
};
