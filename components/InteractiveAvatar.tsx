import {
  AvatarQuality,
  StreamingEvents,
  VoiceChatTransport,
  VoiceEmotion,
  STTProvider,
  ElevenLabsModel,
} from "@heygen/streaming-avatar";
import { useEffect, useRef, useState } from "react";
import { useMemoizedFn, useUnmount } from "ahooks";

import { Button } from "./Button";
import { AvatarConfig } from "./AvatarConfig";
import { AvatarVideo } from "./AvatarSession/AvatarVideo";
import { useStreamingAvatarSession } from "./logic/useStreamingAvatarSession";
import { AvatarControls } from "./AvatarSession/AvatarControls";
import {
  StreamingAvatarProvider,
  StreamingAvatarSessionState,
  useVoiceChat,
} from "./logic";
import { LoadingIcon } from "./Icons";
import { MessageHistory } from "./AvatarSession/MessageHistory";
import { ExtendedStartAvatarRequest } from "./logic/ExtendedTypes";

import { AVATARS } from "@/app/lib/constants";

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
  version: "v2",
};

function InteractiveAvatar() {
  const { initAvatar, startAvatar, stopAvatar, sessionState, stream } = useStreamingAvatarSession();
  const { startVoiceChat } = useVoiceChat();
  const [config, setConfig] = useState(DEFAULT_CONFIG);

  const mediaStream = useRef<HTMLVideoElement>(null);
  const avatarRef = useRef<any>(null);
  const gladiaSocketRef = useRef<WebSocket | null>(null);

  const applyFilter = (text: string): string => {
    if (text.includes("موسیقی")) return "";
    return text;
  };

  const initGladiaSocket = () => {
    gladiaSocketRef.current = new WebSocket("wss://api.gladia.io/audio");
    gladiaSocketRef.current.onopen = () => {
      gladiaSocketRef.current?.send(
        JSON.stringify({
          x_gladia_key: process.env.NEXT_PUBLIC_GLADIA_API_KEY,
          language: "fa",
        })
      );
    };

    gladiaSocketRef.current.onmessage = (event) => {
      const result = JSON.parse(event.data);
      if (!result.transcription) return;

      const filteredText = applyFilter(result.transcription);
      if (!filteredText) return;

      // مستقیماً جمله را به آواتار بده
      avatarRef.current?.speak({ text: filteredText, task_type: "REPEAT" });
    };
  };

  const startMicrophoneStream = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(stream);
    const processor = audioCtx.createScriptProcessor(4096, 1, 1);

    source.connect(processor);
    processor.connect(audioCtx.destination);

    processor.onaudioprocess = (e) => {
      const float32 = e.inputBuffer.getChannelData(0);
      const int16 = new Int16Array(float32.length);
      for (let i = 0; i < float32.length; i++) {
        int16[i] = float32[i] * 32767;
      }
      gladiaSocketRef.current?.send(int16.buffer);
    };
  };

  const fetchAccessToken = async () => {
    const res = await fetch("/api/get-access-token", { method: "POST" });
    const token = await res.text();
    return token;
  };

  const startSession = useMemoizedFn(async () => {
    const token = await fetchAccessToken();
    const avatar = initAvatar(token);

    avatarRef.current = avatar;

    avatar.on(StreamingEvents.AVATAR_START_TALKING, console.log);
    avatar.on(StreamingEvents.AVATAR_STOP_TALKING, console.log);
    avatar.on(StreamingEvents.STREAM_DISCONNECTED, () => console.log("Disconnected"));

    await startAvatar(config);
    await startVoiceChat(true);

    initGladiaSocket();
    startMicrophoneStream();
  });

  useEffect(() => {
    if (stream && mediaStream.current) {
      mediaStream.current.srcObject = stream;
      mediaStream.current.onloadedmetadata = () => {
        mediaStream.current!.play();
      };
    }
  }, [stream]);

  useUnmount(() => {
    gladiaSocketRef.current?.close();
    stopAvatar();
  });

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex flex-col rounded-xl bg-zinc-900 overflow-hidden">
        <div className="relative w-full aspect-video overflow-hidden flex flex-col items-center justify-center">
          {sessionState !== StreamingAvatarSessionState.INACTIVE ? (
            <AvatarVideo ref={mediaStream} />
          ) : (
            <AvatarConfig config={config} onConfigChange={setConfig} />
          )}
        </div>
        <div className="flex flex-col gap-3 items-center justify-center p-4 border-t border-zinc-700 w-full">
          {sessionState === StreamingAvatarSessionState.CONNECTED ? (
            <AvatarControls />
          ) : sessionState === StreamingAvatarSessionState.INACTIVE ? (
            <Button onClick={startSession}>شروع گفت‌وگو</Button>
          ) : (
            <LoadingIcon />
          )}
        </div>
      </div>
      {sessionState === StreamingAvatarSessionState.CONNECTED && <MessageHistory />}
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
