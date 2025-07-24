
"use client";
import React, { forwardRef, useEffect, useRef, useState, RefObject } from "react";
import { ConnectionQuality, StreamingEvents } from "@heygen/streaming-avatar";
import { useConnectionQuality } from "../logic/useConnectionQuality";
import { useStreamingAvatarSession } from "../logic/useStreamingAvatarSession";
import { StreamingAvatarSessionState } from "../logic";
import { CloseIcon } from "../Icons";
import { Button } from "../Button";

export const AvatarVideo = forwardRef<HTMLVideoElement, { avatar: any }>(
  ({ avatar }, ref) => {
    const { sessionState, stopAvatar } = useStreamingAvatarSession();
    const { connectionQuality } = useConnectionQuality();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const bgImageRef = useRef<HTMLImageElement>(null);

    const isLoaded = sessionState === StreamingAvatarSessionState.CONNECTED;
    const [videoVisible, setVideoVisible] = useState(true);
    const [bgImageLoaded, setBgImageLoaded] = useState(false);
    const [videoReady, setVideoReady] = useState(false); // وضعیت آمادگی ویدئو

    const [videoOffset, setVideoOffset] = useState({ x: 0, y: 0 });
    const [legsOffset, setLegsOffset] = useState({ x: 0, y: 0 });
    const [legsScale, setLegsScale] = useState(1);
    const [videoScale, setVideoScale] = useState(1); // مقیاس اولیه ویدئو
    const [showLegsControlPanel, setShowLegsControlPanel] = useState(true);

    // تنظیم ریسایز canvas
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const resize = () => {
        const width = canvas.parentElement?.clientWidth ?? 480;
        canvas.width = width;
        canvas.height = width * 1.5; // نسبت 3:2 برای حفظ استاندارد
      };
      resize();
      window.addEventListener("resize", resize);
      return () => window.removeEventListener("resize", resize);
    }, []);

    // مدیریت رویدادهای صحبت کردن آواتار
    useEffect(() => {
      if (avatar) {
        avatar.on(StreamingEvents.AVATAR_START_TALKING, () => {
          (ref as RefObject<HTMLVideoElement>)?.current?.play();
        });
        avatar.on(StreamingEvents.AVATAR_STOP_TALKING, () => {
          (ref as RefObject<HTMLVideoElement>)?.current?.pause();
        });
      }
    }, [avatar]);

    // مدیریت بارگذاری تصویر پاها
    useEffect(() => {
      const img = bgImageRef.current;
      if (img) {
        img.onload = () => setBgImageLoaded(true);
        img.onerror = () => {
          console.error("Failed to load background image /assets/food.png");
          setBgImageLoaded(false);
        };
      }
    }, []);

    // مدیریت آمادگی ویدئو
    useEffect(() => {
      if (!ref || typeof ref !== "object" || !ref.current) return;
      const video = ref.current;
      const handleLoadedData = () => {
        console.log("Video loaded, dimensions:", { width: video.videoWidth, height: video.videoHeight });
        setVideoReady(true);
      };
      video.addEventListener("loadeddata", handleLoadedData);
      return () => video.removeEventListener("loadeddata", handleLoadedData);
    }, [ref]);

    // مدیریت زوم با Shift و چرخ موس
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const handleWheel = (e: WheelEvent) => {
        if (e.shiftKey) {
          e.preventDefault();
          const delta = e.deltaY > 0 ? -0.1 : 0.1; // تغییر 10% در هر چرخش
          setVideoScale((prev) => Math.max(0.5, Math.min(prev + delta, 2))); // محدوده 50% تا 200%
        }
      };
      canvas.addEventListener("wheel", handleWheel, { passive: false });
      return () => canvas.removeEventListener("wheel", handleWheel);
    }, []);

    // بارگذاری تنظیمات اولیه
    useEffect(() => {
      const fetchConfig = async () => {
        try {
          const res = await fetch("/api/get-avatar-config");
          const config = await res.json();
          if (config) {
            setVideoOffset(config.videoOffset || { x: 0, y: 0 });
            setLegsOffset(config.legsOffset || { x: 0, y: 0 });
            setLegsScale(config.legsScale || 1);
            setVideoScale(config.videoScale || 1);
          }
        } catch (e) {
          console.warn("پیکربندی پیش‌فرض یافت نشد یا خطا داشت");
        }
      };
      fetchConfig();
    }, []);

    // رسم روی canvas
    useEffect(() => {
      if (
        !isLoaded ||
        !ref ||
        typeof ref !== "object" ||
        !(ref as RefObject<HTMLVideoElement>).current ||
        !canvasRef.current ||
        !bgImageLoaded ||
        !videoReady
      ) {
        console.log("Conditions not met for drawing:", {
          isLoaded,
          refExists: !!ref && typeof ref === "object" && !!(ref as RefObject<HTMLVideoElement>).current,
          canvasExists: !!canvasRef.current,
          bgImageLoaded,
          videoReady,
        });
        return;
      }

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d", { willReadFrequently: true, alpha: true })!;
      const video = (ref as RefObject<HTMLVideoElement>).current;
      const bgImg = bgImageRef.current;
      const vw = video.videoWidth;
      const vh = video.videoHeight;

      console.log("Starting draw with dimensions:", { vw, vh, bgImgLoaded: bgImg?.complete });

      const draw = () => {
        const cw = canvas.width;
        const ch = canvas.height;

        if (!vw || !vh || !bgImg?.complete || !bgImg.naturalWidth) {
          console.log("Waiting for video or image to load:", { vw, vh, bgImgComplete: bgImg?.complete });
          requestAnimationFrame(draw);
          return;
        }

        ctx.clearRect(0, 0, cw, ch);
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, cw, ch);

        // رسم ویدئو (قسمت بالای زانو) با حفظ نسبت اصلی و زوم
        const videoAspectRatio = vw / vh;
        let videoDrawWidth = cw * videoScale;
        let videoDrawHeight = videoDrawWidth / videoAspectRatio;
        if (videoDrawHeight > ch) {
          videoDrawHeight = ch;
          videoDrawWidth = videoDrawHeight * videoAspectRatio;
        }
        const videoX =0 //(cw - videoDrawWidth) / 2 + videoOffset.x;
        const videoY = 0//(ch - videoDrawHeight) / 2 + videoOffset.y;
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(video, 0, 0, vw, vh, videoX, videoY, videoDrawWidth, videoDrawHeight);

        // رسم تصویر پاها با حفظ نسبت اصلی
        const legsAspectRatio = bgImg.naturalWidth / bgImg.naturalHeight;
        let legsDrawHeight = ch - videoDrawHeight;
        let legsDrawWidth = legsDrawHeight * legsAspectRatio;
        if (legsDrawWidth > cw) {
          legsDrawWidth = cw;
          legsDrawHeight = legsDrawWidth / legsAspectRatio;
        }
        const legsX = (cw - legsDrawWidth) / 2 + legsOffset.x;
        const legsY = videoY + videoDrawHeight + legsOffset.y;
        ctx.drawImage(bgImg, 0, 0, bgImg.naturalWidth, bgImg.naturalHeight, legsX, legsY, legsDrawWidth * legsScale, legsDrawHeight * legsScale);

        // اعمال گرادیان برای یکپارچگی مرز
        const overlapRegion = 20;
        const gradientY = legsY - overlapRegion;
        const gradient = ctx.createLinearGradient(0, gradientY, 0, legsY);
        gradient.addColorStop(0, "rgba(255,255,255,0)");
        gradient.addColorStop(1, "rgba(255,255,255,1)");
        ctx.fillStyle = gradient;
        ctx.globalCompositeOperation = "destination-over";
        ctx.fillRect(legsX, gradientY, legsDrawWidth * legsScale, overlapRegion);
        ctx.globalCompositeOperation = "source-over";

        requestAnimationFrame(draw);
      };

      requestAnimationFrame(draw);
    }, [isLoaded, ref, bgImageLoaded, videoReady, legsOffset, legsScale, videoOffset, videoScale]);

    useEffect(() => {
      if (!ref || typeof ref !== "object" || !ref.current) return;
      const video = ref.current;
      const checkVisibility = () => {
        const rect = video.getBoundingClientRect();
        setVideoVisible(!(rect.width === 0 || rect.height === 0));
      };
      const observer = new ResizeObserver(checkVisibility);
      observer.observe(video);
      return () => observer.disconnect();
    }, [ref]);

    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.ctrlKey && e.key.toLowerCase() === "j") {
          e.preventDefault();
          setShowLegsControlPanel((prev) => !prev);
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    return (
      <div className="relative bg-white w-full h-full">
        {connectionQuality !== ConnectionQuality.UNKNOWN && (
          <div className="absolute flex flex-col top-3 left-3 bg-black text-white rounded-lg px-3 py-2 z-20">
            Connection Quality: {connectionQuality}
            <Button
              className="top-3 right-3 !p-2 bg-zinc-700 bg-opacity-50 z-20"
              onClick={async () => {
                const config = { videoOffset, legsOffset, legsScale, videoScale };
                try {
                  await fetch("/api/save-avatar-config", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(config),
                  });
                  alert("تنظیمات ذخیره شد");
                } catch (e) {
                  alert("خطا در ذخیره‌سازی");
                }
              }}
            >
              ذخیره تنظیمات
            </Button>
          </div>
        )}
        {isLoaded && (
          <Button
            className="absolute top-3 right-3 !p-2 bg-zinc-700 bg-opacity-50 z-20"
            onClick={stopAvatar}
          >
            <CloseIcon />
          </Button>
        )}
        <>
          <video
            ref={ref}
            autoPlay
            playsInline
            muted={false}
            onError={() => setVideoVisible(false)}
            onEnded={() => setVideoVisible(false)}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              opacity: 0,
              zIndex: -1,
              objectFit: "cover",
            }}
          />
          <canvas
            ref={canvasRef}
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
          <img
            ref={bgImageRef}
            src="/assets/food.png"
            alt="Legs BG"
            style={{ display: "none" }}
          />
          {!videoVisible && (
            <video
              // ref={fallbackVideoRef}
              src="/videos/fallback.mp4"
              autoPlay
              loop
              muted
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          )}
        </>
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            Loading...
          </div>
        )}
        {showLegsControlPanel && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-col gap-2 items-center bg-white bg-opacity-70 p-2 rounded">
            <p className="text-red-600">Legs Control</p>
            <div className="flex gap-2">
              <button onClick={() => setLegsOffset((p) => ({ ...p, y: p.y - 10 }))}>
                ⬆️
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setLegsOffset((p) => ({ ...p, x: p.x - 10 }))}>
                ⬅️
              </button>
              <button onClick={() => setLegsOffset((p) => ({ ...p, x: p.x + 10 }))}>
                ➡️
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setLegsOffset((p) => ({ ...p, y: p.y + 10 }))}>
                ⬇️
              </button>
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={() => setLegsScale((p) => Math.min(p + 0.1, 3))}>
                ➕ Zoom In
              </button>
              <button onClick={() => setLegsScale((p) => Math.max(p - 0.1, 0.2))}>
                ➖ Zoom Out
              </button>
            </div>
          </div>
        )}
      </div>
    );
  },
);

AvatarVideo.displayName = "AvatarVideo";
