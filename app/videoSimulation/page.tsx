'use client'

import React, { useEffect, useRef, useState } from "react";

export default function FullBodyEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [imgOffset, setImgOffset] = useState({ x: 0, y: 0 });
  const [imgScale, setImgScale] = useState(1);
  const [ready, setReady] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 480, height: 720 });

  // ریسپانسیو کردن canvas
  useEffect(() => {
    const handleResize = () => {
      const maxWidth = Math.min(window.innerWidth - 32, 480);
      const ratio = 3 / 2;
      setCanvasSize({
        width: maxWidth,
        height: Math.floor(maxWidth * ratio),
      });
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // لود ویدئو و تصویر
  useEffect(() => {
    const img = imgRef.current!;
    const video = videoRef.current!;

    const loadImage = () =>
      new Promise<void>((resolve, reject) => {
        if (img.complete) resolve();
        else {
          img.onload = () => resolve();
          img.onerror = reject;
        }
      });

    const loadVideo = () =>
      new Promise<void>((resolve, reject) => {
        const onCanPlay = () => {
          video.play().then(resolve).catch(reject);
          video.removeEventListener("canplay", onCanPlay);
        };
        video.addEventListener("canplay", onCanPlay);
        video.onerror = reject;
      });

    Promise.all([loadImage(), loadVideo()])
      .then(() => setReady(true))
      .catch((err) => console.error("Load error:", err));
  }, []);

  // رسم روی canvas
  useEffect(() => {
    // if (!ready) return;

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const video = videoRef.current!;
    const img = imgRef.current!;

    let animationFrameId: number;

    // ارتفاع بالاتنه (مثلاً یک سوم ویدئو)
    const upperBodyHeightInVideo =  video.videoHeight ;

    const draw = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      
        // بک‌گراند سفید
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      
        // ارتفاع بالاتنه (می‌خوای ویدئو کل بالا باشه، مثلا نصف ارتفاع canvas)
        const upperBodyHeightOnCanvas = canvas.height / 2;
      
        // کشیدن ویدئو (بالای canvas)
        ctx.drawImage(
          video,
          0,
          0,
          video.videoWidth,
          video.videoHeight,
          0,
          0,
          canvas.width,
          upperBodyHeightOnCanvas
        );
      
        // اندازه و موقعیت تصویر پایین‌تنه
        const imgWidth = img.width * imgScale;
        const imgHeight = img.height * imgScale;
        const imgX = (canvas.width - imgWidth) / 2 + imgOffset.x; // وسط افقی + آفست
        const imgY = upperBodyHeightOnCanvas + imgOffset.y; // پایین ویدئو + آفست
      
        // کشیدن تصویر پایین‌تنه
        ctx.drawImage(img, imgX, imgY, imgWidth, imgHeight);
      
        animationFrameId = requestAnimationFrame(draw);
      };
      

    draw();

    return () => cancelAnimationFrame(animationFrameId);
  }, [ready, imgOffset, imgScale, canvasSize]);

  // کنترل جابجایی تصویر پایین تنه
  const moveImage = (dx: number, dy: number) => {
    setImgOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
  };

  // کنترل زوم تصویر پایین تنه
  const zoomImage = (delta: number) => {
    setImgScale((prev) => Math.max(0.05,prev + delta));
        
  };


 
  return (
    <div className="flex flex-col items-center gap-4 p-4 max-w-full">
      <div className="w-full max-w-[480px]">
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className="w-full h-auto rounded shadow-md "
          style={{ border: "none", outline: "none" }}
        />
      </div>

      {!ready && <p className="text-gray-500">Loading full-body avatar...</p>}

      <div className="flex flex-col items-center gap-2">
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

      {/* ویدئو با کنترل برای تست */}
      <video
        ref={videoRef}
        src="/videos/heygen-output.mp4"        
        loop
        autoPlay
        muted
        playsInline
        controls
        style={{ width:320, marginTop: 20 }}
        
        
        // style={{ display: "none" }}
      />

      {/* تصویر پنهان */}
      <img
        ref={imgRef}
        src="/assets/lower-body.png"
        alt="Lower body"
        style={{ display: "none", border:'none' }}

      />
    </div>
  );
}
