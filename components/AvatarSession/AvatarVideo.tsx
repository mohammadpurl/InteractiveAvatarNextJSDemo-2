"use client";
import React, {
  forwardRef,
  useEffect,
  useRef,
  useState,
  RefObject,
} from "react";
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
    const fallbackVideoRef = useRef<HTMLVideoElement>(null);
    const lowerBodyRef = useRef<HTMLVideoElement>(null);
    const bgImageRef = useRef<HTMLImageElement>(null);
    const fullBodyRef = useRef<HTMLImageElement>(null);


    const isLoaded = sessionState === StreamingAvatarSessionState.CONNECTED;
    const [videoVisible, setVideoVisible] = useState(true);
    const [bgImageLoaded, setBgImageLoaded] = useState(false); // وضعیت بارگذاری تصویر

    const [videoOffset, setVideoOffset] = useState({ x: 0, y: 0 });
    const [videoScale, setVideoScale] = useState(1);
    const [lowerOffset, setLowerOffset] = useState({ x: 0, y: 0 });
    const [imageScale, setImageScale] = useState(1);

    const [isShiftPressed, setIsShiftPressed] = useState(false);
    const [showControlPanel, setShowControlPanel] = useState(false);

    const [showLegsControlPanel, setShowLegsControlPanel] = useState(true);
    const [legsOffset, setLegsOffset] = useState<{x: number, y: number}>({ x: 0, y: 0 });
    const isDragging = useRef(false);
    const lastMouse = useRef({ x: 0, y: 0 });
    const [legsScale, setLegsScale] = useState<number>(1); // مقدار اولیه 1

    // تنظیم خودکار مقیاس و جابجایی بر اساس ابعاد ویدئوها
    useEffect(() => {
      if (
        (ref as RefObject<HTMLVideoElement>)?.current?.videoWidth &&
        lowerBodyRef.current?.videoWidth
      ) {
        const headHeight =
          (ref as RefObject<HTMLVideoElement>).current.videoHeight * 0.5; // بخش بالایی سر
        const bodyHeight = lowerBodyRef.current.videoHeight * 0.7; // بخش قابل‌استفاده بدنه
        const headAspectRatio =
          (ref as RefObject<HTMLVideoElement>).current.videoWidth /
          (ref as RefObject<HTMLVideoElement>).current.videoHeight;
        const bodyAspectRatio =
          lowerBodyRef.current.videoWidth / lowerBodyRef.current.videoHeight;

        setVideoScale(bodyHeight / headHeight);
        setImageScale(headAspectRatio / bodyAspectRatio);
        setVideoOffset({ x: 0, y: headHeight });
        setLowerOffset({ x: 0, y: headHeight });
      }
    }, [ref, lowerBodyRef]);

    // تنظیم ریسایز canvas
    useEffect(() => {
      const canvas = canvasRef.current;

      if (!canvas) return;
      const resize = () => {
        const width = canvas.parentElement?.clientWidth ?? 480;

        canvas.width = width;
        canvas.height = width * 1.5;
      };

      resize();
      window.addEventListener("resize", resize);

      return () => window.removeEventListener("resize", resize);
    }, []);

    
    // مدیریت رویدادهای صحبت کردن آواتار
    useEffect(() => {
      if (avatar) {
        const lowerVideo = lowerBodyRef.current;

        avatar.on(StreamingEvents.AVATAR_START_TALKING, () => {
          lowerVideo?.play();
        });
        avatar.on(StreamingEvents.AVATAR_STOP_TALKING, () => {
          lowerVideo?.pause();
        });
      }
    }, [avatar]);

    // مدیریت وضعیت کلید Shift و جابجایی با Arrow Keys
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (!isShiftPressed) return;
        const step = 10; // مقدار جابجایی با هر فشار کلید

        switch (e.key) {
          case "ArrowUp":
            e.preventDefault();
            setVideoOffset((prev) => ({ x: prev.x, y: prev.y - step }));
            break;
          case "ArrowDown":
            e.preventDefault();
            setVideoOffset((prev) => ({ x: prev.x, y: prev.y + step }));
            break;
          case "ArrowLeft":
            e.preventDefault();
            setVideoOffset((prev) => ({ x: prev.x - step, y: prev.y }));
            break;
          case "ArrowRight":
            e.preventDefault();
            setVideoOffset((prev) => ({ x: prev.x + step, y: prev.y }));
            break;
          case "Shift":
            setIsShiftPressed(true);
            break;
        }
      };

      const handleKeyUp = (e: KeyboardEvent) => {
        if (e.key === "Shift") {
          setIsShiftPressed(false);
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);

      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
      };
    }, [isShiftPressed]);

    // زوم با چرخ ماوس (بدون جابجایی با ماوس)
    useEffect(() => {
      if (
        !isLoaded ||
        !ref ||
        typeof ref !== "object" ||
        !ref.current ||
        !canvasRef.current ||
        !lowerBodyRef.current
      )
        return;

      const canvas = canvasRef.current;

      if (!canvas) return;

      const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.05 : 0.05;

        if (e.shiftKey) {
          setVideoScale((prev) => Math.max(0.2, prev + delta));
        } else {
          setImageScale((prev) => Math.max(0.1, prev + delta));
        }
      };

      canvas.addEventListener("wheel", handleWheel, { passive: false });

      return () => canvas.removeEventListener("wheel", handleWheel);
    }, []);

    // رسم روی canvas
    useEffect(() => {
      if (
        !isLoaded ||
        !ref ||
        typeof ref !== "object" ||
        !(ref as RefObject<HTMLVideoElement>).current ||
        !canvasRef.current ||
        !lowerBodyRef.current ||
        !bgImageLoaded // منتظر بارگذاری تصویر پس‌زمینه
      )
        return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d", {
        willReadFrequently: true,
        alpha: true,
      })!;
      const video = (ref as RefObject<HTMLVideoElement>).current;
      const videoElement = lowerBodyRef.current;
      const bgImg = bgImageRef.current;
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const vw2 = videoElement.videoWidth;
      const vh2 = videoElement.videoHeight;

      const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        if (e.shiftKey) {
          const delta = e.deltaY > 0 ? -0.05 : 0.05;

          setVideoScale((prev) => Math.max(0.2, prev + delta));
        } else {
          const delta = e.deltaY > 0 ? -0.05 : 0.05;

          setImageScale((prev) => Math.max(0.1, prev + delta));
        }
      };

      const handleMouseDown = (e: MouseEvent) => {
        if (!isShiftPressed) return;
        isDragging.current = true;
        lastMouse.current = { x: e.clientX, y: e.clientY };
      };

      const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging.current || !isShiftPressed) return;
        const dx = e.clientX - lastMouse.current.x;
        const dy = e.clientY - lastMouse.current.y;

        setVideoOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
        lastMouse.current = { x: e.clientX, y: e.clientY };
      };

      const handleMouseUp = () => {
        isDragging.current = false;
      };

      canvas.addEventListener("wheel", handleWheel, { passive: false });
      canvas.addEventListener("mousedown", handleMouseDown);
      canvas.addEventListener("mousemove", handleMouseMove);
      canvas.addEventListener("mouseup", handleMouseUp);
      canvas.addEventListener("mouseleave", handleMouseUp);

      const draw = () => {
        const cw = canvas.width;
        const ch = canvas.height;
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        const bgImage = bgImageRef.current;

        if (
          !vw ||
          !vh ||
          !vw2 ||
          !vh2 ||
          !bgImage?.complete ||
          !bgImage.naturalWidth
        ) {
          requestAnimationFrame(draw);

          return;
        }
      

        const tmpCanvas = document.createElement("canvas");

        tmpCanvas.width = vw;
        tmpCanvas.height = vh;
        const tmpCtx = tmpCanvas.getContext("2d")!;

        tmpCtx.drawImage(video, 0, 0);
        const frame = tmpCtx.getImageData(0, 0, vw, vh);
        const data = frame.data;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i],
            g = data[i + 1],
            b = data[i + 2];
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const delta = max - min;
          let h = 0;

          if (delta !== 0) {
            if (max === r) h = ((g - b) / delta) % 6;
            else if (max === g) h = (b - r) / delta + 2;
            else h = (r - g) / delta + 4;
          }
          h = Math.round(h * 60);
          if (h < 0) h += 360;
          const s = max === 0 ? 0 : delta / max;
          const isGreen =
            h >= 60 && h <= 180 && s > 0.1 && g > r * 1.0 && g > b * 1.0;

          if (isGreen) {
            const greenness = (g - Math.max(r, b)) / (g || 1);
            const alphaValue = Math.max(0, 1 - greenness * 4);

            data[i + 3] = alphaValue < 0.2 ? 0 : Math.round(alphaValue * 255);
          }
        }
        tmpCtx.putImageData(frame, 0, 0);

        ctx.clearRect(0, 0, cw, ch);
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, cw, ch);
        // رسم تصویر full-body به عنوان بک‌گراند
        // const fullBodyImg = fullBodyRef.current;
        // if (fullBodyImg?.complete && fullBodyImg.naturalWidth) {
        //   ctx.drawImage(fullBodyImg, 0, 0, cw, ch); // ابتدا تصویر کامل را می‌کشد
        // }


        // رسم بدنه
        const imgAspectRatio = vw2 / vh2;
        const canvasAspectRatio = cw / ch;
        let bgDrawWidth = cw;
        let bgDrawHeight = ch;

        if (imgAspectRatio > canvasAspectRatio) {
          bgDrawHeight = cw / imgAspectRatio;
        } else {
          bgDrawWidth = ch * imgAspectRatio;
        }
        // const bgDrawX = (cw - bgDrawWidth) / 2;
        // const bgDrawY = (ch - bgDrawHeight) / 2;
        // ctx.drawImage(bgImg, bgDrawX, bgDrawY, bgDrawWidth, bgDrawHeight);

        // رسم بدنه
        
        let drawWidth = cw;
        let drawHeight = ch;

        if (imgAspectRatio > canvasAspectRatio) {
          drawHeight = cw / imgAspectRatio;
        } else {
          drawWidth = ch * imgAspectRatio;
        }
        drawWidth *= imageScale;
        drawHeight *= imageScale;
        const drawX = (cw - drawWidth) / 2 + lowerOffset.x;
        const drawY = (ch - drawHeight) / 2 + lowerOffset.y;
        const cropTop =vh2 * 0.28;
        const cropHeight = vh2 - cropTop;

        ctx.filter = "brightness(1.05) contrast(1.1)";
        ctx.drawImage(
          videoElement,
          0,
          cropTop,
          vw2,
          cropHeight,
          drawX,
          drawY,
          drawWidth,
          drawHeight,
        );
        // 1. ایجاد canvas موقت
        const tmpCanvas2 = document.createElement("canvas");
        tmpCanvas2.width = vw2;
        tmpCanvas2.height = vh2;
        const tmpCtx2 = tmpCanvas2.getContext("2d")!;

        // 2. رسم فریم فعلی ویدیو روی canvas موقت
        tmpCtx2.drawImage(videoElement, 0, 0, vw2, vh2);

        // 3. پردازش تصویر
        const frame2 = tmpCtx2.getImageData(0, 0, vw2, vh2);
        const data2 = frame2.data;

        // 4. رنگ مبدا و مقصد (RGB)
        const targetColor = { r: 11, g: 17, b: 51 };   // #0b1133
        const newColor = { r: 18, g: 27, b: 33 };      // #121b21
        const tolerance = 20; // برای تطبیق رنگ‌های نزدیک

        for (let i = 0; i < data2.length; i += 4) {
          const r = data2[i];
          const g = data2[i + 1];
          const b = data2[i + 2];

          const isMatch =
            Math.abs(r - targetColor.r) < tolerance &&
            Math.abs(g - targetColor.g) < tolerance &&
            Math.abs(b - targetColor.b) < tolerance;

          if (isMatch) {
            data2[i] = newColor.r;
            data2[i + 1] = newColor.g;
            data2[i + 2] = newColor.b;
          }
        }

        tmpCtx2.putImageData(frame2, 0, 0);

        // 5. رسم تصویر پردازش‌شده (crop شده) روی canvas اصلی
        ctx.filter = "brightness(1.05) contrast(1.1)";

        ctx.drawImage(
          tmpCanvas2,
          0,
          cropTop,
          vw2,
          cropHeight,
          drawX,
          drawY,
          drawWidth,
          drawHeight,
        );


        // رسم سر با شفاف‌سازی 50 پیکسل پایینی
        const cropTopHead = 0;
        const cropHeightHead = vh * 0.465; // فقط 46 درصد از ویدئو

        // موقعیت X و Y دلخواه برای نمایش (مثلاً وسط بالا)
        const videoX = (cw - vw) / 2 + videoOffset.x;
        const videoY = videoOffset.y;

        ctx.drawImage(
          tmpCanvas,
          0,
          cropTopHead,
          vw,
          cropHeightHead,
          videoX,
          videoY,
          vw,
          cropHeightHead  // همون اندازه اصلی
        );


        // اعمال گرادیان شفافیت برای 50 پیکسل پایینی سر
        // const transparentHeight = 50;
        // const gradientY = videoY + scaledVideoHeight * 0.65 - transparentHeight;
        // const gradient = ctx.createLinearGradient(
        //   0,
        //   gradientY,
        //   0,
        //   gradientY + transparentHeight,
        // );

        // ctx.fillStyle = gradient;
        // ctx.globalCompositeOperation = "destination-out";
        // ctx.fillRect(videoX, gradientY, scaledVideoWidth, transparentHeight);
        // ctx.globalCompositeOperation = "source-over";

        const legsImage = bgImageRef.current;

        if (legsImage?.complete && legsImage.naturalWidth && drawWidth && drawHeight) {
          const legsAspectRatio =
            legsImage.naturalWidth / legsImage.naturalHeight;

          const safeLegsScale = legsScale && legsScale > 0 ? legsScale : 1;
          const legsWidth = cw * 0.5 * safeLegsScale; // یا مقدار مناسب مثل 0.3 یا 0.4
          const legsHeight = legsWidth / legsAspectRatio;

          const legsX = (cw - legsWidth) / 2 + legsOffset.x;
          const legsY = ch - legsHeight + legsOffset.y;

          ctx.drawImage(legsImage, legsX, legsY, legsWidth, legsHeight);
        }

        requestAnimationFrame(draw);
      };

      requestAnimationFrame(draw);
      return () => {
        canvas.removeEventListener("wheel", handleWheel);
        canvas.removeEventListener("mousedown", handleMouseDown);
        canvas.removeEventListener("mousemove", handleMouseMove);
        canvas.removeEventListener("mouseup", handleMouseUp);
        canvas.removeEventListener("mouseleave", handleMouseUp);
      };
    }, [
      isLoaded,
      ref,
      videoOffset,
      videoScale,
      lowerOffset,
      imageScale,
      legsScale,
      legsOffset,
      isShiftPressed,
      bgImageLoaded, // وابستگی به بارگذاری تصویر
    ]);

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
        if (e.ctrlKey && e.key.toLowerCase() === "i") {
          e.preventDefault();
          setShowControlPanel((prev) => !prev);
        } else if (e.ctrlKey && e.key.toLowerCase() === "j") {
          e.preventDefault();
          setShowLegsControlPanel((prev) => !prev);
        }
      };

      window.addEventListener("keydown", handleKeyDown);

      return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    useEffect(() => {
      if (!ref || typeof ref !== "object" || !ref.current) return;
      const video = ref.current;
      const fetchConfig = async () => {
        try {
          const res = await fetch("/api/get-avatar-config");
          const config = await res.json();

          if (config) {
            setVideoOffset(config.videoOffset);
            setVideoScale(config.videoScale);
            setLowerOffset(config.lowerOffset);
            setImageScale(config.imageScale);
            setLegsScale(config.legsScale ?? 1);
            setLegsOffset(config.legsOffset ?? { x: 0, y: 0 });
          }
        } catch (e) {
          console.warn("پیکربندی پیش‌فرض یافت نشد یا خطا داشت");
        }
      };

      fetchConfig();
    }, [ref]);

    useEffect(() => {
      const img = bgImageRef.current;

      if (img) {
        img.onload = () => setBgImageLoaded(true);
        img.onerror = () =>
          console.error("Failed to load background image /assets/food.png");
      }
    }, []);

    return (
      <div className="relative bg-white w-full h-full">
        {connectionQuality !== ConnectionQuality.UNKNOWN && (
          <div className="absolute flex flex-col top-3 left-3 bg-black text-white rounded-lg px-3 py-2 z-20">
            Connection Quality: {connectionQuality}
            <Button
              className="top-3 right-3 !p-2 bg-zinc-700 bg-opacity-50 z-20"
              onClick={async () => {
                const config = {
                  videoOffset,
                  videoScale,
                  lowerOffset,
                  imageScale,
                  legsOffset, 
                  legsScale, 
                };

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
          <video
            ref={lowerBodyRef}
            src="/videos/lower-body.mp4"
            autoPlay
            loop
            muted
            playsInline
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              visibility: "hidden",
              width: "1px",
              height: "1px",
            }}
          />
          <img
            ref={bgImageRef}
            src="/assets/food.png"
            alt="Lower Body BG"
            style={{ display: "none" }}
          />
          <img
            ref={fullBodyRef}
            src="/assets/full-body.png"
            alt="Full Body Guide"
            style={{ display: "none" }}
          />

          {!videoVisible && (
            <video
              ref={fallbackVideoRef}
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
        {showControlPanel && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-col gap-2 items-center bg-white bg-opacity-70 p-2 rounded">
            <div className="flex gap-2">
              <button
                onClick={() => setLowerOffset((p) => ({ ...p, y: p.y - 10 }))}
              >
                ⬆️
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setLowerOffset((p) => ({ ...p, x: p.x - 10 }))}
              >
                ⬅️
              </button>
              <button
                onClick={() => setLowerOffset((p) => ({ ...p, x: p.x + 10 }))}
              >
                ➡️
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setLowerOffset((p) => ({ ...p, y: p.y + 10 }))}
              >
                ⬇️
              </button>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setImageScale((p) => Math.min(p + 0.1, 3))}
              >
                ➕ Zoom In
              </button>
              <button
                onClick={() => setImageScale((p) => Math.max(p - 0.1, 0.2))}
              >
                ➖ Zoom Out
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Use <b>Shift + Arrow Keys</b> to move video, <b>Shift + Wheel</b>{" "}
              to zoom
            </p>
          </div>
        )}

        {/* کنترل تصویر پا */}
        {showLegsControlPanel && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-col gap-2 items-center bg-white bg-opacity-70 p-2 rounded">
            <p className="text-red-600">Legs Control</p>
            <div className="flex gap-2">
              <button
                onClick={() => setLegsOffset((p) => ({ ...p, y: p.y - 10 }))}
              >
                ⬆️
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setLegsOffset((p) => ({ ...p, x: p.x - 10 }))}
              >
                ⬅️
              </button>
              <button
                onClick={() => setLegsOffset((p) => ({ ...p, x: p.x + 10 }))}
              >
                ➡️
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setLegsOffset((p) => ({ ...p, y: p.y + 10 }))}
              >
                ⬇️
              </button>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setLegsScale((p) => Math.min(p + 0.1, 3))}
              >
                ➕ Zoom In
              </button>
              <button
                onClick={() => setLegsScale((p) => Math.max(p - 0.1, 0.2))}
              >
                ➖ Zoom Out
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Use <b>Shift + Arrow Keys</b> to move video, <b>Shift + Wheel</b>{" "}
              to zoom
            </p>
          </div>
        )}
        
      </div>
    );
  },
);

AvatarVideo.displayName = "AvatarVideo";
