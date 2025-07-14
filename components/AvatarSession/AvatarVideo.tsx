// AvatarVideo.tsx
import React, { forwardRef, useEffect, useRef, useState } from "react";
import { ConnectionQuality } from "@heygen/streaming-avatar";
import QRCode from "react-qr-code";

import { useConnectionQuality } from "../logic/useConnectionQuality";
import { useStreamingAvatarSession } from "../logic/useStreamingAvatarSession";
import { StreamingAvatarSessionState } from "../logic";
import { CloseIcon } from "../Icons";
import { Button } from "../Button";

function applyChromaKey(
  sourceVideo: HTMLVideoElement,
  targetCanvas: HTMLCanvasElement,
  options: {
    minHue: number;
    maxHue: number;
    minSaturation: number;
    threshold: number;
  },
): void {
  const ctx = targetCanvas.getContext("2d", {
    willReadFrequently: true,
    alpha: true,
  });

  if (!ctx || sourceVideo.readyState < 2) return;

  const width = sourceVideo.videoWidth;
  const height = sourceVideo.videoHeight;

  if (!width || !height) return;

  targetCanvas.width = width;
  targetCanvas.height = height;
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(sourceVideo, 0, 0, width, height);

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

    if (delta === 0) h = 0;
    else if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;

    h = Math.round(h * 60);
    if (h < 0) h += 360;

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
    // if (isGreen) {
    //   data[i] = 255;     // R
    //   data[i + 1] = 255; // G
    //   data[i + 2] = 255; // B
    //   data[i + 3] = 255; // A
    // }
  }

  ctx.putImageData(imageData, 0, 0);
}

function setupChromaKey(
  sourceVideo: HTMLVideoElement,
  targetCanvas: HTMLCanvasElement,
  options: {
    minHue: number;
    maxHue: number;
    minSaturation: number;
    threshold: number;
  },
): () => void {
  let animationFrameId: number;
  const render = () => {
    applyChromaKey(sourceVideo, targetCanvas, options);
    animationFrameId = requestAnimationFrame(render);
  };

  render();

  return () => cancelAnimationFrame(animationFrameId);
}

export const AvatarVideo = forwardRef<
  HTMLVideoElement,
  { showQrCode?: boolean; qrCodeValue?: string }
>(({ showQrCode = false, qrCodeValue = "" }, ref) => {
  const { sessionState, stopAvatar } = useStreamingAvatarSession();
  const { connectionQuality } = useConnectionQuality();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fallbackVideoRef = useRef<HTMLVideoElement>(null);

  const isLoaded = sessionState === StreamingAvatarSessionState.CONNECTED;
  const [videoVisible, setVideoVisible] = useState(true);

  useEffect(() => {
    if (!ref || typeof ref !== "object" || !ref.current) return;

    const video = ref.current;
    const checkVisibility = () => {
      const rect = video.getBoundingClientRect();
      const isInvisible = rect.width === 0 || rect.height === 0;

      setVideoVisible(!isInvisible);
    };

    const observer = new ResizeObserver(checkVisibility);

    observer.observe(video);

    return () => observer.disconnect();
  }, [ref]);

  useEffect(() => {
    if (
      !isLoaded ||
      !ref ||
      typeof ref !== "object" ||
      !ref.current ||
      !canvasRef.current
    )
      return;

    const stop = setupChromaKey(ref.current, canvasRef.current, {
      minHue: 60,
      maxHue: 180,
      minSaturation: 0.1,
      threshold: 1.0,
    });

    return () => {
      stop();
    };
  }, [isLoaded, ref]);

  return (
    <>
      {connectionQuality !== ConnectionQuality.UNKNOWN && (
        <div className="absolute top-3 left-3 bg-black text-white rounded-lg px-3 py-2">
          Connection Quality: {connectionQuality}
        </div>
      )}
      {isLoaded && (
        <Button
          className="absolute top-3 right-3 !p-2 bg-zinc-700 bg-opacity-50 z-10"
          onClick={stopAvatar}
        >
          <CloseIcon />
        </Button>
      )}

      {showQrCode ? (
        <div className="w-full h-full flex items-center justify-center">
          <QRCode value={qrCodeValue} size={256} />
        </div>
      ) : (
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
      )}
      {!isLoaded && !showQrCode && (
        <div className="w-full h-full flex items-center justify-center absolute top-0 left-0">
          Loading...
        </div>
      )}
    </>
  );
});

AvatarVideo.displayName = "AvatarVideo";
