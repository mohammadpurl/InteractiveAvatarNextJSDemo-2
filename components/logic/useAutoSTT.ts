// components/logic/useAutoSTT.ts
import { useEffect, useRef } from "react";
import { StreamingEvents } from "@heygen/streaming-avatar";

import { MessageSender, useStreamingAvatarContext } from "./context";

function normalizeText(text: string) {
  // حذف فاصله‌های اضافی و کاراکترهای خاص
  return text
    .replace(/[\s\n\r]+/g, " ")
    .replace(/[.,!?،؛:؛؟]/g, "")
    .trim()
    .toLowerCase();
}

export function useAutoSTT(
  enabled: boolean,
  onTranscript: (text: string) => void,
  isAvatarTalking: boolean,
//   lastAvatarMessage: string
) {
  const recognitionRef = useRef<any>(null);
  const isActiveRef = useRef(false);
  const { handleUserTalkingMessage, messages } =
    useStreamingAvatarContext();

  useEffect(() => {
    if (!enabled) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    isActiveRef.current = false;

    recognition.lang = "fa-IR";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      isActiveRef.current = true;
    };
    recognition.onend = () => {
      isActiveRef.current = false;
    };
    recognition.onresult = (event: any) => {
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        finalTranscript += event.results[i][0].transcript;
      }
      console.log(`finalTranscript ${finalTranscript}`)
      // مقایسه بهینه: اگر متن کاربر به طور کامل در آخرین پیام آواتار وجود داشت، نادیده بگیر
      const userText = normalizeText(finalTranscript);
      const lastAvatarMessage =
        [...messages].reverse().find((m) => m.sender === MessageSender.AVATAR)
          ?.content || "";

      console.log(`lastAvatarMessage ::/ ${lastAvatarMessage}`);

      const avatarText = normalizeText(
        typeof lastAvatarMessage === "string" ? lastAvatarMessage : "",
      );

    //   console.log(`lastAvatarMessage is :${avatarText}`)
      if (
        userText.length > 0 &&
        avatarText.length > 0 &&
        avatarText.includes(userText)
      ) {
        // console.log(
        //   "Ignored duplicate avatar message (substring match in hook)",
        // );

        return;
      }
      if (userText.length > 0) {
        onTranscript(finalTranscript);
        // console.log(finalTranscript)
        handleUserTalkingMessage({
          detail: {
            type: StreamingEvents.USER_TALKING_MESSAGE,
            task_id: Date.now().toString(),
            message: finalTranscript,
          },
        });
      }
    };

    // اگر آواتار صحبت نمی‌کند، recognition را فعال کن (با delay اختیاری)
    if (!isAvatarTalking) {
      setTimeout(() => {
        if (!isActiveRef.current) {
          try {
            recognition.start();
          } catch (e) {
            console.warn("Recognition start error (initial):", e);
          }
        }
      }, 5000); // delay اختیاری (مثلاً ۱.۲ ثانیه)
    }

    return () => {
      try {
        recognition.stop();
      } catch {}
      isActiveRef.current = false;
    };
  }, [enabled, onTranscript, handleUserTalkingMessage, isAvatarTalking]);

  useEffect(() => {
    if (!recognitionRef.current) return;
    if (isAvatarTalking) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    } else if (enabled) {
      try {
        recognitionRef.current.start();
      } catch (e) {}
    }
  }, [isAvatarTalking, enabled]);

  return recognitionRef;
}
