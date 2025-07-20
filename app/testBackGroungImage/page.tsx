"use client";
import { useRef, useEffect } from "react";

export default function CanvasTest() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d")!;
    const img = new Image();
    img.src = "/assets/full-body.png";

    img.onload = () => {
      // اندازه صفحه را به canvas بده
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      // نسبت‌ها
      const imgAspect = img.naturalWidth / img.naturalHeight;
      const canvasAspect = canvas.width / canvas.height;

      let drawWidth, drawHeight;

      if (imgAspect > canvasAspect) {
        // تصویر عریض‌تر از canvas است
        drawWidth = canvas.width;
        drawHeight = canvas.width / imgAspect;
      } else {
        // تصویر بلندتر از canvas است
        drawHeight = canvas.height;
        drawWidth = canvas.height * imgAspect;
      }

      const offsetX = (canvas.width - drawWidth) / 2;
      const offsetY = (canvas.height - drawHeight) / 2;

      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100vw",
        height: "100vh",
        display: "block",
        backgroundColor: "#eee",
      }}
    />
  );
}
