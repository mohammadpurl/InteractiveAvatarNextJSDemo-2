'use client';

import { useEffect, useRef, useState } from 'react';

export default function AutoSTTRecorder() {
  const [transcript, setTranscript] = useState('');
  const [status, setStatus] = useState('Waiting...');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const init = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      source.connect(analyser);
      const data = new Uint8Array(analyser.fftSize);

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const formData = new FormData();
        formData.append('audio', audioBlob);
        formData.append('language', 'fa');

        setStatus('در حال ارسال برای Gladia...');

        const res = await fetch('/api/gladia-stt', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        const text = filterWords(data.transcription || '');
        setTranscript(text);
        setStatus('منتظر صحبت بعدی...');
        audioChunksRef.current = [];
      };

      mediaRecorderRef.current = mediaRecorder;

      const detectVoice = () => {
        analyser.getByteTimeDomainData(data);
        const isSpeaking = data.some((v) => Math.abs(v - 128) > 10);

        if (isSpeaking) {
          if (mediaRecorder.state === 'inactive') {
            mediaRecorder.start();
            setStatus('🔴 ضبط شروع شد...');
          }

          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        } else {
          if (mediaRecorder.state === 'recording' && !silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              mediaRecorder.stop();
              setStatus('🟡 ضبط متوقف شد');
            }, 1500); // اگر ۱.۵ ثانیه سکوت بود، ضبط قطع شود
          }
        }

        requestAnimationFrame(detectVoice);
      };

      detectVoice();
    };

    init();
  }, []);

  const filterWords = (text: string) => {
    const banned = ['موسیقی', 'آهنگ', 'صدا'];
    let filtered = text;

    for (const word of banned) {
      filtered = filtered.replace(new RegExp(word, 'gi'), '');
    }

    return filtered.trim();
  };

  return (
    <div className="p-4">
      <p className="text-gray-700">وضعیت: {status}</p>
      <p className="mt-4 text-gray-800">متن نهایی:</p>
      <pre className="bg-gray-100 p-3 rounded">{transcript}</pre>
    </div>
  );
}
