import { useEffect, useRef, useState } from "react";

export function useAutoRecorder(onSegment: (audioBlob: Blob) => void) {
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceStartRef = useRef<number | null>(null);

  useEffect(() => {
    let audioContext: AudioContext;
    let analyser: AnalyserNode;
    let source: MediaStreamAudioSourceNode;
    let rafId: number;

    async function start() {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContext = new AudioContext();
      source = audioContext.createMediaStreamSource(stream);
      analyser = audioContext.createAnalyser();
      source.connect(analyser);

      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        audioChunksRef.current = [];
        onSegment(blob);
      };

      function checkSilence() {
        const data = new Uint8Array(analyser.fftSize);
        analyser.getByteTimeDomainData(data);
        const rms =
          Math.sqrt(
            data.reduce((sum, v) => sum + (v - 128) ** 2, 0) / data.length
          ) / 128;

        if (rms > 0.02) {
          // کاربر صحبت می‌کند
          if (!recording) {
            setRecording(true);
            mediaRecorderRef.current?.start();
            silenceStartRef.current = null;
          } else {
            silenceStartRef.current = null;
          }
        } else {
          // سکوت
          if (recording) {
            if (!silenceStartRef.current) {
              silenceStartRef.current = Date.now();
            } else if (Date.now() - silenceStartRef.current > 1000) {
              // ۱ ثانیه سکوت
              setRecording(false);
              mediaRecorderRef.current?.stop();
              silenceStartRef.current = null;
            }
          }
        }
        rafId = requestAnimationFrame(checkSilence);
      }
      rafId = requestAnimationFrame(checkSilence);
    }

    start();

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      audioContext?.close();
      mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line
  }, []);

  return { recording };
}
