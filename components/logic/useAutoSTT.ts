// components/logic/useAutoSTT.ts
import { useEffect, useRef } from "react";
import { useVAD } from "../../hooks/useVAD";

import { MessageSender, useStreamingAvatarContext } from "./context";

function normalizeText(text: string) {
  return text
    .replace(/[\s\n\r]+/g, " ")
    .replace(/[.,!?،؛:؛؟]/g, "")
    .trim()
    .toLowerCase();
}

export function useAutoSTT(
  enabled: boolean,
  onTranscript: (text: string) => void,
) {
  const recognitionRef = useRef<any | null>(null);
  const isActiveRef = useRef(false);
  const { isAvatarTalking, messages } = useStreamingAvatarContext();

  // Hook VAD: فقط وقتی صدا تشخیص داده شد این تابع صدا می‌زند
  const { isSpeaking } = useVAD(
    () => {
      if (
        !enabled ||
        isAvatarTalking ||
        isActiveRef.current ||
        !recognitionRef.current
      )
        return;

      try {
        recognitionRef.current.start();
        // console.log("[STT] started after VAD trigger");
      } catch (e: any) {
        if (
          e.name === "InvalidStateError" ||
          e.message?.includes("recognition has already started")
        ) {
          // Ignore, already started
        } else {
          console.warn("STT start error:", e);
        }
      }
    },
    { threshold: 0.015 },
  );

  useEffect(() => {
    if (!enabled) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      // console.warn("SpeechRecognition API not supported");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    isActiveRef.current = false;

    recognition.lang = "fa-IR";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      isActiveRef.current = true;
      // console.log("[STT] onstart");
    };

    recognition.onend = () => {
      isActiveRef.current = false;
      // console.log("[STT] onend");
    };

    recognition.onerror = (e: any) => {
      // console.warn("[STT] onerror", e);
      isActiveRef.current = false;
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        finalTranscript += event.results[i][0].transcript;
      }

      const userText = normalizeText(finalTranscript);
      const lastAvatarMessage =
        [...messages].reverse().find((m) => m.sender === MessageSender.AVATAR)
          ?.content || "";

      const avatarText = normalizeText(
        typeof lastAvatarMessage === "string" ? lastAvatarMessage : "",
      );

      if (
        userText.length > 0 &&
        avatarText.length > 0 &&
        avatarText.includes(userText)
      ) {
        // console.log("[STT] Ignored duplicate message");
        return;
      }

      if (userText.length > 0) {
        onTranscript(finalTranscript);
        // console.log("[STT] Final transcript:", finalTranscript);
      }
    };

    return () => {
      try {
        recognition.stop();
      } catch {}
      isActiveRef.current = false;
    };
  }, [enabled, onTranscript, messages, isAvatarTalking]);

  // اگر آواتار شروع به صحبت کرد، STT را قطع کن
  useEffect(() => {
    if (isAvatarTalking) {
      recognitionRef.current?.stop();
      // console.log("[STT] stopped because avatar is talking");
    }
  }, [isAvatarTalking]);

  return recognitionRef;
}
