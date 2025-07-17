"use client";

import React, { useEffect, useRef, useState, forwardRef } from "react";

import { ConnectionQuality } from "@heygen/streaming-avatar";
import QRCode from "react-qr-code";
import { StreamingAvatarSessionState, useConnectionQuality, useStreamingAvatarSession } from "./logic";
import { Button } from "./Button";
import { CloseIcon } from "./Icons";

function applyChromaKey(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  options: {
    minHue: number;
    maxHue: number;
    minSaturation: number;
    threshold: number;
  },
  backgroundImg?: HTMLImageElement,
  offset = { x: 0, y: 0 },
  scale = 1,
) {
  const ctx = canvas.getContext("2d", {
    willReadFrequently: true,
    alpha: true,
  });
  if (!ctx || video.readyState < 2) return;

  const width = (canvas.width = video.videoWidth);
  const height = (canvas.height = video.videoHeight);

  ctx.clearRect(0, 0, width, height);

  // رسم تصویر پایین‌تنه (قبل از ویدیو)
  if (backgroundImg) {
    const imgW = backgroundImg.width * scale;
    const imgH = backgroundImg.height * scale;
    const imgX = (width - imgW) / 2 + offset.x;
    const imgY = height / 2 + offset.y;
    ctx.drawImage(backgroundImg, imgX, imgY, imgW, imgH);
  }

  ctx.drawImage(video, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    let h = 0;

    if (delta !== 0) {
      if (max === r) h = ((g - b) / delta) % 6;
      else if (max === g) h = (b - r) / delta + 2;
      else h = (r - g) / delta + 4;
      h *= 60;
      if (h < 0) h += 360;
    }

    const s = max === 0 ? 0 : delta / max;
    const v = max / 255;

    const isGreen =
      h >= options.minHue &&
      h <= options.maxHue &&
      s > options.minSaturation &&
      v > 0.15 &&
      g > r * options.threshold &&
      g > b * options.threshold;

    if (isGreen) {
      const greenness = (g - Math.max(r, b)) / (g || 1);
      const alphaValue = Math.max(0, 1 - greenness * 4);
      data[i + 3] = alphaValue < 0.2 ? 0 : Math.round(alphaValue * 255);
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

// Combined component
function getRefCurrent(
  ref: React.ForwardedRef<HTMLVideoElement>
): HTMLVideoElement | null {
  if (ref && typeof ref === "object" && "current" in ref) {
    return ref.current;
  }

  return null;
}

export const FullBodyAvatarVideo = forwardRef<
  HTMLVideoElement,
  {
    showQrCode?: boolean;
    qrCodeValue?: string;
    lowerBodySrc?: string;
  }
>(
  (
    {
      showQrCode = false,
      qrCodeValue = "",
      lowerBodySrc = "/assets/lower-body.png",
    },
    ref,
  ) => {
    const { sessionState, stopAvatar } = useStreamingAvatarSession();
    const { connectionQuality } = useConnectionQuality();

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const lowerImgRef = useRef<HTMLImageElement>(null);
    const fallbackVideoRef = useRef<HTMLVideoElement>(null);

    const isLoaded = sessionState === StreamingAvatarSessionState.CONNECTED;
    const [videoVisible, setVideoVisible] = useState(true);

    const [imgOffset, setImgOffset] = useState({ x: 0, y: 0 });
    const [imgScale, setImgScale] = useState(1);

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
      const video = getRefCurrent(ref);

      if (!isLoaded || !video || !canvasRef.current || !lowerImgRef.current)
        return;

      let animId: number;
      const draw = () => {
        applyChromaKey(
          video,
          canvasRef.current!,
          {
            minHue: 60,
            maxHue: 180,
            minSaturation: 0.1,
            threshold: 1.0,
          },
          lowerImgRef.current!,
          imgOffset,
          imgScale,
        );
        animId = requestAnimationFrame(draw);
      };
      draw();
      return () => cancelAnimationFrame(animId);
    }, [isLoaded, ref, imgOffset, imgScale]);

    const moveImage = (dx: number, dy: number) => {
      setImgOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    };

    const zoomImage = (delta: number) => {
      setImgScale((prev) => Math.max(0.05, prev + delta));
    };

    return (
      <div className="relative w-full max-w-[480px] mx-auto p-4 flex flex-col items-center">
        {/* نمایش QR یا آواتار */}
        {showQrCode ? (
          <QRCode value={qrCodeValue} size={256} />
        ) : (
          <>
            <video
              ref={ref}
              autoPlay
              playsInline
              muted={false}
              style={{
                opacity: 0,
                position: "absolute",
                width: "50%",
                height: "50%",
                zIndex: -1,
              }}
            />
            <canvas
              ref={canvasRef}
              className="w-full h-auto rounded shadow"
              style={{ background: "#fff" }}
            />
            <img
              ref={lowerImgRef}
              src={lowerBodySrc}
              alt="Lower"
              style={{ display: "none" }}
            />
          </>
        )}

        {/* اگر ویدئو لود نشد */}
        {!videoVisible && (
          <video
            ref={fallbackVideoRef}
            src="/videos/fallback.mp4"
            autoPlay
            loop
            muted={false}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        )}

        {/* وضعیت اتصال */}
        {connectionQuality !== ConnectionQuality.UNKNOWN && (
          <div className="absolute top-3 left-3 bg-black text-white rounded-lg px-3 py-2 text-sm">
            Connection: {connectionQuality}
          </div>
        )}

        {/* دکمه بستن آواتار */}
        {isLoaded && (
          <Button
            className="absolute top-3 right-3 !p-2 bg-zinc-700 bg-opacity-50 z-10"
            onClick={stopAvatar}
          >
            <CloseIcon />
          </Button>
        )}

        {/* کنترل‌های حرکت و زوم */}
        <div className="mt-4 flex flex-col items-center gap-2">
          <div className="flex gap-2">
            <button onClick={() => moveImage(0, -10)}>⬆️</button>
          </div>
          <div className="flex gap-2">
            <button onClick={() => moveImage(-10, 0)}>⬅️</button>
            <button onClick={() => moveImage(10, 0)}>➡️</button>
          </div>
          <div className="flex gap-2">
            <button onClick={() => moveImage(0, 10)}>⬇️</button>
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={() => zoomImage(0.1)}>➕ Zoom In</button>
            <button onClick={() => zoomImage(-0.1)}>➖ Zoom Out</button>
          </div>
        </div>

        {/* وضعیت لود */}
        {!isLoaded && !showQrCode && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500">
            Loading...
          </div>
        )}
      </div>
    );
  },
);

FullBodyAvatarVideo.displayName = "FullBodyAvatarVideo";
