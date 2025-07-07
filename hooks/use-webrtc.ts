"use client";

import { useState, useRef, useEffect } from "react";

interface TranscriptionMessage {
  type: string;
  transcript?: string;
  text?: string;
  isFinal?: boolean;
}

interface UseWebRTCAudioSessionReturn {
  status: string;
  isSessionActive: boolean;
  audioIndicatorRef: React.RefObject<HTMLDivElement | null>;
  startSession: () => Promise<void>;
  stopSession: () => void;
  handleStartStopClick: () => void;
  msgs: TranscriptionMessage[];
  currentVolume: number;
}

export default function useWebRTCAudioSession(): UseWebRTCAudioSessionReturn {
  const [status, setStatus] = useState("");
  const [isSessionActive, setIsSessionActive] = useState(false);

  // Audio references for local mic
  const audioIndicatorRef = useRef<HTMLDivElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);

  // WebRTC references
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);

  // Keep track of transcription messages
  const [msgs, setMsgs] = useState<TranscriptionMessage[]>([]);

  // Volume analysis
  const [currentVolume, setCurrentVolume] = useState(0);

  function setupAudioVisualization(stream: MediaStream) {
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyzer = audioContext.createAnalyser();
    analyzer.fftSize = 256;
    source.connect(analyzer);

    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const updateIndicator = () => {
      if (!audioContext) return;
      analyzer.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / bufferLength;

      if (audioIndicatorRef.current) {
        audioIndicatorRef.current.classList.toggle("active", average > 30);
      }
      requestAnimationFrame(updateIndicator);
    };
    updateIndicator();

    audioContextRef.current = audioContext;
  }

  function configureDataChannel(dataChannel: RTCDataChannel) {
    const sessionUpdate = {
      type: "session.update",
      session: {
        modalities: ["audio", "text"],
        input_audio_transcription: {
          model: "whisper-1",
          language: "fa",
          prompt: "این یک مکالمه به زبان فارسی است."
        },
      },
    };
    dataChannel.send(JSON.stringify(sessionUpdate));
  }

  async function handleDataChannelMessage(event: MessageEvent) {
    try {
      const msg = JSON.parse(event.data);
      console.log("=== OpenAI Transcription Response ===");
      console.log("Raw message:", event.data);
      console.log("Parsed message:", msg);
      console.log("Message type:", msg.type);
      console.log("Transcript:", msg.transcript || msg.text);
      console.log(
        "Is Final:",
        msg.type === "conversation.item.input_audio_transcription.completed",
      );
      console.log("=====================================");

      switch (msg.type) {
        case "conversation.item.input_audio_transcription": {
          // Partial transcription
          setMsgs((prev) => [
            ...prev,
            {
            type: msg.type,
              transcript: msg.transcript || msg.text || "در حال شنیدن...",
            isFinal: false
          }]);
          break;
        }
        case "conversation.item.input_audio_transcription.completed": {
          // Final transcription
          debugger;
          console.log("Final transcription:", msg.transcript);
          setMsgs(prev => [...prev, {
            type: msg.type,
            transcript: msg.transcript || "",
            isFinal: true
          }]);
          break;
        }
      }
    } catch (error) {
      console.error("Error handling data channel message:", error);
    }
  }

  async function startSession() {
    try {
      setStatus("درخواست دسترسی به میکروفون...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      setupAudioVisualization(stream);

      setStatus("دریافت توکن...");
      const ephemeralToken = await getEphemeralToken();

      setStatus("برقراری ارتباط...");
      const pc = new RTCPeerConnection();
      peerConnectionRef.current = pc;

      // Data channel for transcripts
      const dataChannel = pc.createDataChannel("response");
      dataChannelRef.current = dataChannel;

      dataChannel.onopen = () => configureDataChannel(dataChannel);
      dataChannel.onmessage = handleDataChannelMessage;

      // Add local (mic) track
      pc.addTrack(stream.getTracks()[0]);

      // Create offer & set local description
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send SDP offer to OpenAI Realtime
      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = "gpt-4o-realtime-preview"; // Use whisper-1 for transcription
      const response = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralToken}`,
          "Content-Type": "application/sdp",
        },
      });

      if (!response.ok) {
        throw new Error(`خطا در ارتباط با سرور: ${response.status}`);
      }

      // Set remote description
      const answerSdp = await response.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

      setIsSessionActive(true);
      setStatus("در حال شنیدن...");
    } catch (err) {
      console.error("startSession error:", err);
      setStatus(`خطا: ${err}`);
      stopSession();
    }
  }

  async function getEphemeralToken() {
    const response = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
      throw new Error(`خطا در دریافت توکن: ${response.status}`);
    }
    const data = await response.json();
    return data.client_secret.value;
  }

  function stopSession() {
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
    if (audioIndicatorRef.current) {
      audioIndicatorRef.current.classList.remove("active");
    }

    setCurrentVolume(0);
    setIsSessionActive(false);
    setStatus("ارتباط قطع شد");
    setMsgs([]);
  }

  function handleStartStopClick() {
    if (isSessionActive) {
      stopSession();
    } else {
      startSession();
    }
  }

  useEffect(() => {
    return () => stopSession();
  }, []);

  return {
    status,
    isSessionActive,
    audioIndicatorRef,
    startSession,
    stopSession,
    handleStartStopClick,
    msgs,
    currentVolume,
  };
}