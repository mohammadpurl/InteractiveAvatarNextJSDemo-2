"use client";

import React, { useEffect, useRef } from "react";

export default function FullBodyEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lowerBodyRef = useRef<HTMLVideoElement>(null);
  const headRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const lowerBodyVideo = lowerBodyRef.current;
    const headVideo = headRef.current;

    if (!canvas || !lowerBodyVideo || !headVideo) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      if (lowerBodyVideo.readyState >= 2) {
        ctx.drawImage(lowerBodyVideo, 0, 0, canvas.width, canvas.height);
      }

    //   if (headVideo.readyState >= 2) {
    //     // فقط سر را در بالا نمایش بده
    //     const headWidth = canvas.width / 3;
    //     const headHeight = canvas.height / 3;
    //     const headX = (canvas.width - headWidth) / 2;
    //     const headY = 0;
    //     ctx.drawImage(headVideo, headX, headY, headWidth, headHeight);
    //   }

      requestAnimationFrame(draw);
    };

    draw();
  }, []);

  return (
    <div className="w-screen h-screen relative overflow-hidden">
      {/* Hidden video for body */}
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

      {/* Hidden video for head */}
      <video
        ref={headRef}
        src="/videos/Untitled Video.mp4"
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

      {/* Main canvas */}
      <canvas
        ref={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight}
        className="absolute top-0 left-0 w-full h-full"
      />
    </div>
  );
}
