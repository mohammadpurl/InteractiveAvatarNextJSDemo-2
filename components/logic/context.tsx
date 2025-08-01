import { askQuestion } from "@/services/api";
import { saveConversation } from "@/services/api";
import StreamingAvatar, {
  ConnectionQuality,
  StreamingTalkingMessageEvent,
  TaskType,
  UserTalkingMessageEvent,
} from "@heygen/streaming-avatar";
import React, { useRef, useState, useEffect } from "react";

import { useBookingFlow } from "./useBookingFlow";
import { useReservationState } from "./useReservationState";
import { isValidIranianNationalId } from "./useReservationState";

export enum StreamingAvatarSessionState {
  INACTIVE = "inactive",
  CONNECTING = "connecting",
  CONNECTED = "connected",
}

export enum MessageSender {
  CLIENT = "CLIENT",
  AVATAR = "AVATAR",
}

export interface Message {
  id: string;
  sender: MessageSender;
  content: string;
}

type StreamingAvatarContextProps = {
  avatarRef: React.MutableRefObject<StreamingAvatar | null>;
  basePath?: string;
  isMuted: boolean;
  setIsMuted: (isMuted: boolean) => void;
  isVoiceChatLoading: boolean;
  setIsVoiceChatLoading: (isVoiceChatLoading: boolean) => void;
  isVoiceChatActive: boolean;
  setIsVoiceChatActive: (isVoiceChatActive: boolean) => void;
  sessionState: StreamingAvatarSessionState;
  setSessionState: (sessionState: StreamingAvatarSessionState) => void;
  stream: MediaStream | null;
  setStream: (stream: MediaStream | null) => void;
  messages: Message[];
  clearMessages: () => void;
  handleUserTalkingMessage: (event: {
    detail: UserTalkingMessageEvent;
  }) => void;
  handleStreamingTalkingMessage: (event: {
    detail: StreamingTalkingMessageEvent;
  }) => void;
  handleEndMessage: () => void;
  isListening: boolean;
  setIsListening: (isListening: boolean) => void;
  isUserTalking: boolean;
  setIsUserTalking: (isUserTalking: boolean) => void;
  isAvatarTalking: boolean;
  setIsAvatarTalking: (isAvatarTalking: boolean) => void;
  connectionQuality: ConnectionQuality;
  setConnectionQuality: (connectionQuality: ConnectionQuality) => void;
  lastAvatarMessage: string;
  handleTranscript: (
    text: string,
    options?: {
      sendMessageSync?: (t: string) => void;
      avatar?: StreamingAvatar | null;
      startTranscribe?: boolean;
    },
  ) => Promise<void>;
  isQrCodeMode: boolean;
  setIsQrCodeMode: (v: boolean) => void;
};

const StreamingAvatarContext = React.createContext<StreamingAvatarContextProps>(
  {
    avatarRef: { current: null },
    isMuted: true,
    setIsMuted: () => {},
    isVoiceChatLoading: false,
    setIsVoiceChatLoading: () => {},
    isVoiceChatActive: false,
    setIsVoiceChatActive: () => {},
    sessionState: StreamingAvatarSessionState.INACTIVE,
    setSessionState: () => {},
    stream: null,
    setStream: () => {},
    messages: [],
    clearMessages: () => {},
    handleUserTalkingMessage: () => {},
    handleStreamingTalkingMessage: () => {},
    handleEndMessage: () => {},
    isListening: false,
    setIsListening: () => {},
    isUserTalking: false,
    setIsUserTalking: () => {},
    isAvatarTalking: false,
    setIsAvatarTalking: () => {},
    connectionQuality: ConnectionQuality.UNKNOWN,
    setConnectionQuality: () => {},
    lastAvatarMessage: "",
    handleTranscript: async () => {},
    isQrCodeMode: false,
    setIsQrCodeMode: () => {},
  },
);

const useStreamingAvatarSessionState = () => {
  const [sessionState, setSessionState] = useState(
    StreamingAvatarSessionState.INACTIVE,
  );
  const [stream, setStream] = useState<MediaStream | null>(null);

  return { sessionState, setSessionState, stream, setStream };
};

const useStreamingAvatarVoiceChatState = () => {
  const [isMuted, setIsMuted] = useState(true);
  const [isVoiceChatLoading, setIsVoiceChatLoading] = useState(false);
  const [isVoiceChatActive, setIsVoiceChatActive] = useState(false);

  return {
    isMuted,
    setIsMuted,
    isVoiceChatLoading,
    setIsVoiceChatLoading,
    isVoiceChatActive,
    setIsVoiceChatActive,
  };
};

const useStreamingAvatarListeningState = () => {
  const [isListening, setIsListening] = useState(false);

  return { isListening, setIsListening };
};

const useStreamingAvatarTalkingState = () => {
  const [isUserTalking, setIsUserTalking] = useState(false);
  const [isAvatarTalking, setIsAvatarTalking] = useState(false);

  return {
    isUserTalking,
    setIsUserTalking,
    isAvatarTalking,
    setIsAvatarTalking,
  };
};

const useStreamingAvatarConnectionQualityState = () => {
  const [connectionQuality, setConnectionQuality] = useState(
    ConnectionQuality.UNKNOWN,
  );

  return { connectionQuality, setConnectionQuality };
};

// Helpers
function normalizeText(text: string) {
  return text
    .replace(/[\s\n\r]+/g, " ")
    .replace(/[.,!?،؛:؛؟]/g, "")
    .trim()
    .toLowerCase();
}
function removeConsecutiveDuplicates(text: string) {
  const sentences = text.split(/(?<=[.!؟])\s+/);
  const result: string[] = [];

  for (let i = 0; i < sentences.length; i++) {
    if (sentences[i] && sentences[i] !== sentences[i - 1]) {
      result.push(sentences[i]);
    }
  }

  return result.join(" ").trim();
}
function similarity(a: string, b: string) {
  if (!a.length && !b.length) return 1;
  if (!a.length || !b.length) return 0;
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  const longerLength = longer.length;
  const editDistance = levenshtein(longer, shorter);

  return (longerLength - editDistance) / longerLength;
}
function levenshtein(a: string, b: string) {
  const matrix = [];

  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

const useStreamingAvatarMessageState = ({
  isAvatarTalking,
  setIsQrCodeMode,
}: {
  isAvatarTalking: boolean;
  setIsQrCodeMode: (val: boolean) => void;
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const currentSenderRef = useRef<MessageSender | null>(null);
  const lastAvatarMessageRef = useRef<string>("");
  const isClearingRef = useRef(false); // جلوگیری از چند بار اجرا

  const handleUserTalkingMessage = ({
    detail,
  }: {
    detail: UserTalkingMessageEvent;
  }) => {
    if (currentSenderRef.current === MessageSender.CLIENT) {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          ...prev[prev.length - 1],
          content: [prev[prev.length - 1].content, detail.message].join(""),
        },
      ]);
    } else {
      currentSenderRef.current = MessageSender.CLIENT;
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: MessageSender.CLIENT,
          content: detail.message,
        },
      ]);
    }
  };

  const handleStreamingTalkingMessage = ({
    detail,
  }: {
    detail: StreamingTalkingMessageEvent;
  }) => {
    if (currentSenderRef.current === MessageSender.AVATAR) {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          ...prev[prev.length - 1],
          content: [prev[prev.length - 1].content, detail.message].join(""),
        },
      ]);
    } else {
      currentSenderRef.current = MessageSender.AVATAR;
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: MessageSender.AVATAR,
          content: detail.message,
        },
      ]);
    }
  };

  const handleEndMessage = () => {
    currentSenderRef.current = null;
  };

  useEffect(() => {
    const avatarMessages = messages.filter(
      (m) => m.sender === MessageSender.AVATAR,
    );

    if (avatarMessages.length > 0) {
      lastAvatarMessageRef.current =
        avatarMessages[avatarMessages.length - 1].content;

      const lastMsg = avatarMessages[avatarMessages.length - 1]?.content ?? "";

      if (
        lastMsg.includes("کیو آر کد") ||
        lastMsg.includes("کیوآرکد") ||
        lastMsg.toLowerCase().includes("qr code") ||
        lastMsg.toLowerCase().includes("qrcode") ||
        (lastMsg.includes("کد") && lastMsg.includes("پرداخت"))
      ) {
        debugger
        setIsQrCodeMode(true);
      }
    }
  }, [messages]);

  const { bookingStep, handleBookingFlow } = useBookingFlow();
  const { ticketInfo, updateInfo } = useReservationState();
  const [nationalIdRetry, setNationalIdRetry] = useState(0);
  const MAX_NID_RETRY = 3;

  const handleTranscript = async (
    text: string,
    options?: {
      sendMessageSync?: (t: string) => void;
      avatar?: any;
      startTranscribe?: boolean;
    },
  ) => {
    console.log("handleTranscript", text);
    const userText = normalizeText(removeConsecutiveDuplicates(text));
    const lastAvatarText = normalizeText(lastAvatarMessageRef.current);
    const threshold = 0.6;
    const isContain = lastAvatarText.includes(userText);

    if (
      userText.length > 0 &&
      (similarity(userText, lastAvatarText) > threshold || isContain)
    ) {
      return;
    }

    if (
      options?.avatar &&
      !isAvatarTalking && // ✅ حالا به‌درستی در دسترس است
      options?.sendMessageSync
    ) {
      try {
        options.sendMessageSync(text);
        console.log(`log user speach hear: ${text}`);
        // debugger;
        console.log(bookingStep);
        updateInfo(lastAvatarText, text);
        console.log("ticketInfo :::", ticketInfo);

        // if (/کد\s*ملی/.test(lastAvatarText)) {
        //   const rawNid = text.replace(/[^\d]/g, "");

        //   if (!isValidIranianNationalId(rawNid)) {
        //     if (nationalIdRetry < MAX_NID_RETRY) {
        //       setNationalIdRetry(nationalIdRetry + 1);
        //       if (options.avatar) {
        //         await options.avatar.speak({
        //           text: "کد ملی وارد شده نامعتبر است. لطفاً یک کد ملی ۱۰ رقمی معتبر وارد کنید.",
        //           taskType: TaskType.REPEAT,
        //         });
        //       }

        //       return; // منتظر ورودی بعدی کاربر بمان
        //     } else {
        //       setNationalIdRetry(0); // ریست برای دفعات بعد
        //       if (options.avatar) {
        //         await options.avatar.speak({
        //           text: "کد ملی وارد شده نامعتبر بود. لطفاً در صورت نیاز بعداً اصلاح کنید.",
        //           taskType: TaskType.REPEAT,
        //         });
        //       }

        //       // می‌توانی اینجا ادامه فلو را اجرا کنی یا فقط پیام خطا بدهی
        //       return;
        //     }
        //   } else {
        //     setNationalIdRetry(0); // ریست شمارنده در صورت موفقیت
        //   }
        // }
        // if (avatar) {
        //   try {
        //     const response = await askQuestion(text);

        //     if (response.answer || response.text) {
        //       await avatar.speak({
        //         text: response.answer || response.text,
        //         taskType: TaskType.REPEAT,
        //       });
        //     }
        //   } catch (error) {
        //     console.error('Error processing transcribed text:', error);
        //   }
        // }
      } catch (error) {
        console.error("Error processing transcribed text:", error);
      }
    }
  };

  // تابع پاک‌سازی پیام‌ها فقط یک بار اجرا شود
  const clearMessages = async () => {
    if (isClearingRef.current) return;
    isClearingRef.current = true;
    try {
      await saveConversation(messages);
    } catch (e) {
      console.error("Failed to save conversation before clearing:", e);
    }
    setMessages([]);
    currentSenderRef.current = null;
    // isClearingRef.current را اینجا ریست نمی‌کنیم تا سشن جدید شروع شود
  };

  // ریست flag هنگام شروع سشن جدید
  useEffect(() => {
    isClearingRef.current = false;
  }, []);

  return {
    messages,
    lastAvatarMessage: lastAvatarMessageRef.current,
    clearMessages,
    handleUserTalkingMessage,
    handleStreamingTalkingMessage,
    handleEndMessage,
    handleTranscript,
  };
};

export const StreamingAvatarProvider = ({
  children,
  basePath,
}: {
  children: React.ReactNode;
  basePath?: string;
}) => {
  const avatarRef = useRef<StreamingAvatar>(null);
  const [isQrCodeMode, setIsQrCodeMode] = useState(false);
  const voiceChatState = useStreamingAvatarVoiceChatState();
  const sessionState = useStreamingAvatarSessionState();
  const talkingState = useStreamingAvatarTalkingState();
  const messageState = useStreamingAvatarMessageState({
    isAvatarTalking: talkingState.isAvatarTalking,
    setIsQrCodeMode,
  });
  const listeningState = useStreamingAvatarListeningState();
  const connectionQualityState = useStreamingAvatarConnectionQualityState();
  
  return (
    <StreamingAvatarContext.Provider
      value={{
        avatarRef,
        basePath,
        ...voiceChatState,
        ...sessionState,
        ...messageState,
        ...listeningState,
        ...talkingState,
        ...connectionQualityState,
        handleTranscript: messageState.handleTranscript,
        isQrCodeMode,
        setIsQrCodeMode,
      }}
    >
      {children}
    </StreamingAvatarContext.Provider>
  );
};

export const useStreamingAvatarContext = () => {
  return React.useContext(StreamingAvatarContext);
};
