// hooks/useVAD.ts
import { useEffect, useRef, useState } from "react";

export function useVAD(
  onVoiceDetected: () => void,
  options = { threshold: 0.01 },
) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    const init = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      mediaStreamRef.current = stream;

      const audioContext = new AudioContext();

      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();

      analyser.fftSize = 1024;
      source.connect(analyser);
      analyserRef.current = analyser;

      const data = new Uint8Array(analyser.frequencyBinCount);

      const checkVolume = () => {
        analyser.getByteFrequencyData(data);
        const volume = data.reduce((a, b) => a + b) / data.length / 256;

        if (volume > options.threshold) {
          if (!isSpeaking) {
            setIsSpeaking(true);
            onVoiceDetected(); // 🎯 فقط همینجا اجازه‌ی STT داده میشه
          }
        } else {
          setIsSpeaking(false);
        }

        requestAnimationFrame(checkVolume);
      };

      checkVolume();
    };

    init();

    return () => {
      audioContextRef.current?.close();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return { isSpeaking };
}
