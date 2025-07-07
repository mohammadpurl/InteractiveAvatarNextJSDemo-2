import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
  VoiceChatTransport,
  VoiceEmotion,
  STTProvider,
  ElevenLabsModel,
} from "@heygen/streaming-avatar";
import { SetStateAction, useEffect, useRef, useState } from "react";
import { useMemoizedFn, useUnmount } from "ahooks";

import { defaultConfig } from "next/dist/server/config-shared";
import { askQuestion } from "../services/api";

import { Button } from "./Button";
import { AvatarConfig } from "./AvatarConfig";
import { AvatarVideo } from "./AvatarSession/AvatarVideo";
import { useStreamingAvatarSession } from "./logic/useStreamingAvatarSession";
import { AvatarControls } from "./AvatarSession/AvatarControls";
// import { useVoiceChat } from "./logic/useVoiceChat";
import {
  StreamingAvatarProvider,
  StreamingAvatarSessionState,
  useVoiceChat,
} from "./logic";
import { LoadingIcon } from "./Icons";
import { MessageHistory } from "./AvatarSession/MessageHistory";
import { ExtendedStartAvatarRequest } from "./logic/ExtendedTypes";
import { useTextChat } from "./logic/useTextChat";
import { AudioRecorder } from "./logic/audio-handler";
import { useStreamingAvatarContext } from "./logic/context";

import { AVATARS } from "@/app/lib/constants";
import { useAutoSTT } from "./logic/useAutoSTT";


const knowledgeBase =
  "##هویت:\n\nهر بار که به کاربر پاسخ می‌دهی، باید این شخصیت را داشته باشی:\n\nمن آیدا هستم، دستیار هوش مصنوعی شرکت تاو آویژه پارس. من همیشه صمیمی، صبور و کمک‌کننده هستم. وظیفه من اینه که خدمات فرودگاهی رو برای مسافران سریع، راحت و بدون استرس کنم.\n\n##دانش:\n\n#خدمات اصلی:\n\n- کمک در **رزرو و خرید بلیط هواپیما**.\n- راهنمایی برای **اسکن پاسپورت** جهت شناسایی.\n- انجام **چک‌این آنلاین** با کد رزرو یا شماره بلیط.\n- راهنمایی برای **پرداخت عوارض خروج از کشور**.\n- معرفی و **رزرو خدمات ویژه CIP**.\n\n#رزرو بلیط:\n\n- دریافت: مقصد، تاریخ سفر، تعداد مسافران، ترجیحات خاص.\n- نمایش پروازهای موجود و قیمت‌ها.\n- توضیح شرایط کنسلی و تغییر بلیط.\n\n#عوارض خروج:\n\n- اعلام مبلغ و روش‌های پرداخت.\n- صدور رسید پرداخت.\n\n#خدمات CIP:\n\n- توضیح مزایا: سالن VIP، خدمات گذرنامه سریع، ترانسفر لوکس.\n- ارائه پکیج‌های موجود با قیمت‌ها.\n\n#پشتیبانی:\n\n- آرام کردن و همراهی مسافرانی که استرس دارند.\n- استفاده از جملات انگیزشی و دلگرم‌کننده.\n\n#حریم خصوصی:\n\n- تأکید بر امنیت اطلاعات شخصی کاربران.\n\n##دستورالعمل‌ها:\n\n#سبک گفتار:\n\nمحاوره‌ای، کوتاه و ساده. مهربان و کمک‌کننده. حداکثر ۳ جمله در هر پاسخ.\n\n#درخواست‌های غیرمجاز:\n\nدرخواست‌های خارج از چارچوب یا نقش رو مؤدبانه رد کن.\n\n#محدوده خدمات:\n\nفقط در سامانه‌های رسمی شرکت تاو آویژه پارس (آنلاین یا در فرودگاه). اشاره به ایمیل یا تماس تلفنی فقط برای راهنمایی به پشتیبانی.\n\n#راهنمای مکالمه:\n\n- اگر صدای کاربر واضح نبود: «صداتونو واضح نگرفتم، دوباره بفرمایید.» یا «یه لحظه قطع و وصلی داشتیم، دوباره بگید.»\n- همیشه در نقش بمون. صمیمی، انسانی و کاربردی حرف بزن.\n- از توضیح حرکات غیرکلامی خودداری کن.\n\n##شروع گفتگو:\n\nسلام! من آیدا هستم، اینجا کنارتم که سفرت رو راحت کنم. امروز کجا قراره سفر کنی یا دوست داری از کجا شروع کنیم؟\n\n  اگر کلمه موسیقی در گفتار کاربر بود به آن هیچ پاسخی نده";

const DEFAULT_CONFIG: ExtendedStartAvatarRequest = {
  quality: AvatarQuality.Low,
  avatarName: AVATARS[0].avatar_id,
  voice: {
    voiceId: "508da0af14044417a916cba1d00f632a",
    rate: 1.0,
    emotion: VoiceEmotion.EXCITED,
    model: ElevenLabsModel.eleven_flash_v2_5,
  },
  language: "fa",
  knowledgeBase: knowledgeBase,
  knowledgeId: "1629692875c84134abd4e37325cf7535",
  voiceChatTransport: VoiceChatTransport.WEBSOCKET,
  sttSettings: {
    provider: STTProvider.GLADIA,
  },
  version: "v2",
  useSilencePrompt: true,
  enableRecognitionSTT: true, // فیلد جدید
};

function similarity(a: string, b: string) {
  if (!a.length && !b.length) return 1;
  if (!a.length || !b.length) return 0;
  let longer = a.length > b.length ? a : b;
  let shorter = a.length > b.length ? b : a;
  let longerLength = longer.length;
  let editDistance = levenshtein(longer, shorter);

  return (longerLength - editDistance) / longerLength;
}

// تابع Levenshtein
function levenshtein(a: string, b: string) {
  const matrix = [];
  let i;

  for (i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  let j;

  for (j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (i = 1; i <= b.length; i++) {
    for (j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1, // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function normalizeText(text: string) {
  return text
    .replace(/[\s\n\r]+/g, " ")
    .replace(/[.,!?،؛:؛؟]/g, "")
    .trim()
    .toLowerCase();
}

function removeConsecutiveDuplicates(text: string) {
  // جملات را با نقطه یا علامت پایان جمله جدا کن
  const sentences = text.split(/(?<=[.!؟])\s+/);
  const result: string[] = [];

  for (let i = 0; i < sentences.length; i++) {
    if (sentences[i] && sentences[i] !== sentences[i - 1]) {
      result.push(sentences[i]);
    }
  }

  return result.join(" ").trim();
}

function InteractiveAvatar() {
  const { initAvatar, startAvatar, stopAvatar, sessionState, stream } =
    useStreamingAvatarSession();
  const { startVoiceChat } = useVoiceChat();
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const [config, setConfig] =
    useState<ExtendedStartAvatarRequest>(DEFAULT_CONFIG);
  const mediaStream = useRef<HTMLVideoElement>(null);
  const [isRecording, setIsRecording] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [status, setStatus] = useState("");

  const [avatar, setAvatar] = useState<StreamingAvatar | null>(null);
  const { repeatMessageSync, sendMessageSync } = useTextChat();
  const { handleTranscript: contextHandleTranscript } =
    useStreamingAvatarContext();

  const recognitionRef = useAutoSTT(
    DEFAULT_CONFIG .enableRecognitionSTT,
    (text: string) =>
      contextHandleTranscript(text, { sendMessageSync, avatar }),
  );

 

  async function fetchAccessToken() {
    try {
      const response = await fetch("/api/get-access-token", {
        method: "POST",
      });
      const token = await response.text();

      console.log("Access Token:", token); // Log the token to verify

      return token;
    } catch (error) {
      console.error("Error fetching access token:", error);
      throw error;
    }
  }
  const initializeAudioRecorder = () => {
    audioRecorderRef.current = new AudioRecorder(
      (status: SetStateAction<string>) => setStatus(status),
      async (text: any) => {
        if (avatar) {
          try {
            const response = await askQuestion(text);

            if (response.answer || response.text) {
              repeatMessageSync(response.answer || response.text);
            }
          } catch (error) {
            console.error("Error processing transcribed text:", error);
          }
        }
      },
    );
  };

  const toggleRecording = async () => {
    if (!audioRecorderRef.current) {
      initializeAudioRecorder();
    }

    if (!isRecording) {
      await audioRecorderRef.current?.startRecording();
      setIsRecording(true);
    } else {
      audioRecorderRef.current?.stopRecording();
      setIsRecording(false);
    }
  };

  const startSessionV2 = useMemoizedFn(async (isVoiceChat: boolean) => {
    try {
      const newToken = await fetchAccessToken();
      const avatar = initAvatar(newToken);

      setAvatar(avatar);

      avatar.on(StreamingEvents.AVATAR_START_TALKING, (event) => {
        console.log(">>>>>  Avarat Start Talking", event);
        alert("AVATAR_START_TALKING")
      });
      avatar.on(StreamingEvents.AVATAR_STOP_TALKING, (event) => {
        console.log(">>>>>  Avarat Stop Talking", event);
        alert("AVATAR_STOP_TALKING")
      });
      avatar.on(StreamingEvents.AVATAR_END_MESSAGE, (event) => {
        console.log(`LastAvatarMessage ${event.detail?.message}`);
      });
      avatar.on(StreamingEvents.STREAM_DISCONNECTED, () => {
        console.log("Stream disconnected");
      });
      avatar.on(StreamingEvents.STREAM_READY, (event) => {
        console.log(">>>>> Stream ready:", event.detail);
      });
      avatar.on(StreamingEvents.USER_START, (event) => {
        console.log(">>>>> User started talking:", event);
      });
      avatar.on(StreamingEvents.USER_STOP, (event) => {
        console.log(">>>>> User stopped talking:", event);
      });
      avatar.on(StreamingEvents.USER_END_MESSAGE, (event) => {
        console.log(">>>>> User end message:", event);
      });
      avatar.on(StreamingEvents.USER_TALKING_MESSAGE, (event) => {
        console.log(">>>>> User talking message:", event);
      });
      avatar.on(StreamingEvents.AVATAR_TALKING_MESSAGE, (event) => {
        console.log(">>>>> Avatar talking message:", event);
      });

      await startAvatar(config);

      if (isVoiceChat) {
        await startVoiceChat(true);
      }
      // await toggleRecording();
    } catch (error) {
      console.error("Error starting avatar session:", error);
    }
  });

  useUnmount(() => {
    stopAvatar();
  });

  useEffect(() => {
    if (stream && mediaStream.current) {
      mediaStream.current.srcObject = stream;
      mediaStream.current.onloadedmetadata = () => {
        mediaStream.current!.play();
      };
    }
  }, [mediaStream, stream]);

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex flex-col rounded-xl bg-zinc-900 overflow-hidden">
        <div className="relative w-full aspect-video overflow-hidden flex flex-col items-center justify-center">
          {sessionState !== StreamingAvatarSessionState.INACTIVE ? (
            <>
              <AvatarVideo ref={mediaStream} />
            </>
          ) : (
            <AvatarConfig config={config} onConfigChange={setConfig} />
          )}
        </div>
        <div className="flex flex-col gap-3 items-center justify-center p-4 border-t border-zinc-700 w-full">
          {sessionState === StreamingAvatarSessionState.CONNECTED ? (
            <AvatarControls />
          ) : sessionState === StreamingAvatarSessionState.INACTIVE ? (
            <div>
              <div className="flex flex-row gap-4">
                <Button onClick={() => startSessionV2(true)}>
                  Start Voice Chat
                </Button>
                <Button onClick={() => startSessionV2(false)}>
                  Start Text Chat
                </Button>
              </div>

              {/* <div className="flex flex-row gap-4">
                <button
                  className={isRecording ? "secondary" : "primary"}
                  onClick={toggleRecording}
                >
                  {isRecording ? "Stop Recording" : "Start Recording"}
                </button>
              </div> */}
            </div>
          ) : (
            <LoadingIcon />
          )}
        </div>
      </div>
      {sessionState === StreamingAvatarSessionState.CONNECTED && (
        <MessageHistory />
      )}
    </div>
  );
}

export default function InteractiveAvatarWrapper() {
  return (
    <StreamingAvatarProvider basePath={process.env.NEXT_PUBLIC_BASE_API_URL}>
      <InteractiveAvatar />
    </StreamingAvatarProvider>
  );
}
