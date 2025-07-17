"use client";
import React, {
  forwardRef,
  useEffect,
  useRef,
  useState,
} from "react";
import { ConnectionQuality } from "@heygen/streaming-avatar";
import QRCode from "react-qr-code";

import { useConnectionQuality } from "../logic/useConnectionQuality";
import { useStreamingAvatarSession } from "../logic/useStreamingAvatarSession";
import { StreamingAvatarSessionState } from "../logic";
import { CloseIcon } from "../Icons";
import { Button } from "../Button";

export const AvatarVideo = forwardRef<
  HTMLVideoElement,
  { showQrCode?: boolean; qrCodeValue?: string }
>(({ showQrCode = false, qrCodeValue = "" }, ref) => {
  const { sessionState, stopAvatar } = useStreamingAvatarSession();
  const { connectionQuality } = useConnectionQuality();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fallbackVideoRef = useRef<HTMLVideoElement>(null);
  const lowerBodyRef = useRef<HTMLImageElement>(null);

  const isLoaded = sessionState === StreamingAvatarSessionState.CONNECTED;
  const [videoVisible, setVideoVisible] = useState(true);

  const [videoOffset, setVideoOffset] = useState({ x: 0, y: 0 });
  const [videoScale, setVideoScale] = useState(1);

  const [lowerOffset, setLowerOffset] = useState({ x: 0, y: 0 });
  const [imageScale, setImageScale] = useState(1);

  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  // canvas responsive
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

  // keyboard shift state
  useEffect(() => {
    const down = (e: KeyboardEvent) => e.key === "Shift" && setIsShiftPressed(true);
    const up = (e: KeyboardEvent) => e.key === "Shift" && setIsShiftPressed(false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // main drawing
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
    const ctx = canvas.getContext("2d", {
      willReadFrequently: true,
      alpha: false,
    })!;
    const video = ref.current;
    const img = lowerBodyRef.current;

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

      if (!vw || !vh) {
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
        const isGreen = h >= 60 && h <= 180 && s > 0.1 && g > r * 1.0 && g > b * 1.0;
        // if (isGreen) {
        //   data[i] = 255;
        //   data[i + 1] = 255;
        //   data[i + 2] = 255;
        //   data[i + 3] = 255;
        // }
        if (isGreen) {
          data[i + 3] = 0; // شفاف‌سازی پیکسل
        }
      }

      tmpCtx.putImageData(frame, 0, 0);

      ctx.clearRect(0, 0, cw, ch);
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, cw, ch);

      // draw lower body
      const iw = img.width * imageScale;
      const ih = img.height * imageScale;
      const ix = (cw - iw) / 2 + lowerOffset.x;
      const iy = ch / 2 + lowerOffset.y;
      ctx.drawImage(img, ix, iy, iw, ih);

      // draw video on top
      const scaledVideoWidth = cw * videoScale;
      const scaledVideoHeight = ch / 2 * videoScale;
      const videoX = (cw - scaledVideoWidth) / 2 + videoOffset.x;
      const videoY = videoOffset.y;

     // فقط 40 درصد بالایی ویدئو را بکش:
    ctx.drawImage(
        tmpCanvas,
        0,
        0,
        vw,
        vh * 0.5,
        videoX,
        videoY,
        scaledVideoWidth,
        scaledVideoHeight,
    );

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
  }, [isLoaded, ref, videoOffset, videoScale, lowerOffset, imageScale, isShiftPressed]);

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

  return (
    <div className="relative w-full h-full">
      {connectionQuality !== ConnectionQuality.UNKNOWN && (
        <div className="absolute top-3 left-3 bg-black text-white rounded-lg px-3 py-2 z-20">
          Connection Quality: {connectionQuality}
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
          <img
            ref={lowerBodyRef}
            src="/assets/1.jpg"
            alt="lower-body"
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
      )}

      {!isLoaded && !showQrCode && (
        <div className="absolute inset-0 flex items-center justify-center">
          Loading...
        </div>
      )}

      {/* Controls for lower-body image */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-col gap-2 items-center bg-white bg-opacity-70 p-2 rounded">
        <div className="flex gap-2">
          <button onClick={() => setLowerOffset((p) => ({ ...p, y: p.y - 10 }))}>⬆️</button>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setLowerOffset((p) => ({ ...p, x: p.x - 10 }))}>⬅️</button>
          <button onClick={() => setLowerOffset((p) => ({ ...p, x: p.x + 10 }))}>➡️</button>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setLowerOffset((p) => ({ ...p, y: p.y + 10 }))}>⬇️</button>
        </div>
        <div className="flex gap-2 mt-2">
          <button onClick={() => setImageScale((p) => Math.min(p + 0.1, 3))}>➕ Zoom In</button>
          <button onClick={() => setImageScale((p) => Math.max(p - 0.1, 0.2))}>➖ Zoom Out</button>
        </div>
        <p className="text-xs text-gray-600 mt-1">Use <b>Shift + Mouse</b> to zoom/move video</p>
      </div>
    </div>
  );
});

AvatarVideo.displayName = "AvatarVideo";
