import {
  AvatarQuality,
  StreamingEvents,
  VoiceChatTransport,
  VoiceEmotion,
  StartAvatarRequest,
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
import { useVoiceChat } from "./logic/useVoiceChat";
import { StreamingAvatarProvider, StreamingAvatarSessionState } from "./logic";
import { LoadingIcon } from "./Icons";
import { MessageHistory } from "./AvatarSession/MessageHistory";
import { useSpeechFilter } from "./logic/useSpeechFilter";
import { useAudioFilter } from "./logic/useAudioFilter";

import { AVATARS } from "@/app/lib/constants";
import { ExtendedStartAvatarRequest } from "./logic/ExtendedTypes";

const knowlegeBase="##هویت:\n\nهر بار که به کاربر پاسخ می‌دهی، باید این شخصیت را داشته باشی:\n\nمن آیدا هستم، دستیار هوش مصنوعی شرکت تاو آویژه پارس. من همیشه صمیمی، صبور و کمک‌کننده هستم. وظیفه من اینه که خدمات فرودگاهی رو برای مسافران سریع، راحت و بدون استرس کنم.\n\n##دانش:\n\n#خدمات اصلی:\n\n- کمک در **رزرو و خرید بلیط هواپیما**.\n- راهنمایی برای **اسکن پاسپورت** جهت شناسایی.\n- انجام **چک‌این آنلاین** با کد رزرو یا شماره بلیط.\n- راهنمایی برای **پرداخت عوارض خروج از کشور**.\n- معرفی و **رزرو خدمات ویژه CIP**.\n\n#رزرو بلیط:\n\n- دریافت: مقصد، تاریخ سفر، تعداد مسافران، ترجیحات خاص.\n- نمایش پروازهای موجود و قیمت‌ها.\n- توضیح شرایط کنسلی و تغییر بلیط.\n\n#عوارض خروج:\n\n- اعلام مبلغ و روش‌های پرداخت.\n- صدور رسید پرداخت.\n\n#خدمات CIP:\n\n- توضیح مزایا: سالن VIP، خدمات گذرنامه سریع، ترانسفر لوکس.\n- ارائه پکیج‌های موجود با قیمت‌ها.\n\n#پشتیبانی:\n\n- آرام کردن و همراهی مسافرانی که استرس دارند.\n- استفاده از جملات انگیزشی و دلگرم‌کننده.\n\n#حریم خصوصی:\n\n- تأکید بر امنیت اطلاعات شخصی کاربران.\n\n##دستورالعمل‌ها:\n\n#سبک گفتار:\n\nمحاوره‌ای، کوتاه و ساده. مهربان و کمک‌کننده. حداکثر ۳ جمله در هر پاسخ.\n\n#درخواست‌های غیرمجاز:\n\nدرخواست‌های خارج از چارچوب یا نقش رو مؤدبانه رد کن.\n\n#محدوده خدمات:\n\nفقط در سامانه‌های رسمی شرکت تاو آویژه پارس (آنلاین یا در فرودگاه). اشاره به ایمیل یا تماس تلفنی فقط برای راهنمایی به پشتیبانی.\n\n#راهنمای مکالمه:\n\n- اگر صدای کاربر واضح نبود: «صداتونو واضح نگرفتم، دوباره بفرمایید.» یا «یه لحظه قطع و وصلی داشتیم، دوباره بگید.»\n- همیشه در نقش بمون. صمیمی، انسانی و کاربردی حرف بزن.\n- از توضیح حرکات غیرکلامی خودداری کن.\n\n##شروع گفتگو:\n\nسلام! من آیدا هستم، اینجا کنارتم که سفرت رو راحت کنم. امروز کجا قراره سفر کنی یا دوست داری از کجا شروع کنیم؟\n\n  اگر کلمه موسیقی در گفتار کاربر بود به آن هیچ پاسخی نده";

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
  knowledgeBase: knowlegeBase,
  knowledgeId: "1629692875c84134abd4e37325cf7535",
  voiceChatTransport: VoiceChatTransport.WEBSOCKET,
  sttSettings: {
    provider: STTProvider.GLADIA,
  },
  version: "v2",
};

function InteractiveAvatar() {
  const { initAvatar, startAvatar, stopAvatar, sessionState, stream } =
    useStreamingAvatarSession();
  const { startVoiceChat } = useVoiceChat();
  const { handleUserStart, handleUserStop } = useSpeechFilter();
  const { startFiltering, stopFiltering } = useAudioFilter();

  const [config, setConfig] = useState<ExtendedStartAvatarRequest>(DEFAULT_CONFIG);

  const mediaStream = useRef<HTMLVideoElement>(null);

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

  const startSessionV2 = useMemoizedFn(async (isVoiceChat: boolean) => {
    try {
      const newToken = await fetchAccessToken();
      const avatar = initAvatar(newToken);

      avatar.on(StreamingEvents.AVATAR_START_TALKING, (e) => {
        console.log("Avatar started talking", e);
      });
      avatar.on(StreamingEvents.AVATAR_STOP_TALKING, (e) => {
        console.log("Avatar stopped talking", e);
      });
      avatar.on(StreamingEvents.STREAM_DISCONNECTED, () => {
        console.log("Stream disconnected");
        stopFiltering();
      });
      avatar.on(StreamingEvents.STREAM_READY, (event) => {
        console.log(">>>>> Stream ready:", event.detail);
        if (isVoiceChat) {
          startFiltering();
        }
      });
      avatar.on(StreamingEvents.USER_START, (event) => {
        console.log(">>>>> User started talking:", event);
        handleUserStart();
      });
      avatar.on(StreamingEvents.USER_STOP, (event) => {
        console.log(">>>>> User stopped talking:", event);
        handleUserStop();
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
      avatar.on(StreamingEvents.AVATAR_END_MESSAGE, (event) => {
        console.log(">>>>> Avatar end message:", event);
      });

      await startAvatar(config);

      if (isVoiceChat) {
        await startVoiceChat();
      }
    } catch (error) {
      console.error("Error starting avatar session:", error);
    }
  });

  useUnmount(() => {
    stopFiltering();
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
            <AvatarVideo ref={mediaStream} />
          ) : (
            <AvatarConfig config={config} onConfigChange={setConfig} />
          )}
        </div>
        <div className="flex flex-col gap-3 items-center justify-center p-4 border-t border-zinc-700 w-full">
          {sessionState === StreamingAvatarSessionState.CONNECTED ? (
            <AvatarControls />
          ) : sessionState === StreamingAvatarSessionState.INACTIVE ? (
            <div className="flex flex-row gap-4">
              <Button onClick={() => startSessionV2(true)}>
                Start Voice Chat
              </Button>
              <Button onClick={() => startSessionV2(false)}>
                Start Text Chat
              </Button>
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
