import React, { useEffect, useRef } from "react";
import { StreamingEvents } from "@heygen/streaming-avatar";

import { useStreamingAvatarContext } from "./logic/context";

type AutoSTTProps = {
  onTranscript: (text: string) => void;
};

const getSpeechRecognition = () => {
  const SpeechRecognition =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;

  return SpeechRecognition ? new SpeechRecognition() : null;
};

const AutoSTT: React.FC<AutoSTTProps> = ({ onTranscript }) => {
  const recognitionRef = useRef<any>(null);
  const isRecognizingRef = useRef(false);
  const { handleUserTalkingMessage } = useStreamingAvatarContext();

  useEffect(() => {
    const recognition = getSpeechRecognition();

    if (!recognition) {
      handleUserTalkingMessage({
        detail: {
          type: StreamingEvents.USER_TALKING_MESSAGE,
          task_id: Date.now().toString(),
          message: "SpeechRecognition API is not supported in this browser.",
        },
      });

      return;
    }
    recognition.lang = "fa-IR"; // یا "en-US"
    recognition.continuous = false; // هر بار فقط یک جمله/عبارت را می‌گیرد
    recognition.interimResults = false;

    recognition.onstart = () => {
      isRecognizingRef.current = true;
    };
    recognition.onend = () => {
      isRecognizingRef.current = false;
      setTimeout(() => {
        if (!isRecognizingRef.current) {
          try {
            recognition.start();
          } catch (e) {
            console.warn("Recognition start error (onend):", e);
          }
        }
      }, 500);
    };
    recognition.onresult = (event: any) => {
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        finalTranscript += event.results[i][0].transcript;
      }
      if (finalTranscript.trim()) {
        onTranscript(finalTranscript);
        handleUserTalkingMessage({
          detail: {
            type: StreamingEvents.USER_TALKING_MESSAGE,
            task_id: Date.now().toString(),
            message: finalTranscript,
          },
        });
      }
    };
    recognition.onerror = (event: any) => {
      // console.warn("Recognition error:", event.error);
      isRecognizingRef.current = false;
      if (
        event.error === "no-speech" ||
        event.error === "aborted" ||
        event.error === "network"
      ) {
        setTimeout(() => {
          if (!isRecognizingRef.current) {
            try {
              recognition.start();
            } catch (e) {
              console.warn("Recognition start error (onerror):", e);
            }
          }
        }, 1000);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    isRecognizingRef.current = true;

    return () => {
      recognition.stop();
      isRecognizingRef.current = false;
    };
  }, [onTranscript, handleUserTalkingMessage]);

  return null; // UI لازم نیست
};

export default AutoSTT;
