'use client'
import { useEffect, useRef } from 'react';

const VideoAvatarCanvas = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const backgroundImage = '/videos/lower-body.png'; // مسیر تصویر نیم‌تنه پایین
  const videoSource = '/videos/heygen-output.mp4'; // مسیر ویدئوی ضبط‌شده

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animationFrameId: number;
    // بارگذاری تصویر پس‌زمینه
    const bgImage = new Image();
    bgImage.src = backgroundImage;

    // رندر فریم‌ها در canvas
    const render = () => {
      if (!video) return;
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        // تنظیم ابعاد canvas
        canvas.width = 640;
        canvas.height = 480;

        // رسم تصویر پس‌زمینه (فقط یک‌بار)
        ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);

        // برش و موقعیت‌یابی ویدئو (فقط ناحیه سر)
        const videoWidth = 200; // عرض ناحیه سر
        const videoHeight = 150; // ارتفاع ناحیه سر
        const videoX = (canvas.width - videoWidth) / 2; // مرکز افقی
        const videoY = 20; // موقعیت عمودی برای قرار گرفتن بالای نیم‌تنه
        const sourceX = 0; // برش از ویدئو (ناحیه سر)
        const sourceY = 0; // برش از ویدئو (ناحیه سر)
        const sourceWidth = video.videoWidth; // عرض کامل ویدئو
        const sourceHeight = video.videoHeight * 0.4; // برش 40% بالای ویدئو برای سر

        ctx.drawImage(
          video,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          videoX,
          videoY,
          videoWidth,
          videoHeight
        );
      }
      animationFrameId = requestAnimationFrame(render);
    };

    if (!video) return;
    video.muted = true; // اضافه کنید
    video.src = videoSource;
    video.loop = true;
    video.play();

    // بارگذاری تصویر و شروع رندر
    bgImage.onload = () => {
      video.onloadedmetadata = () => {
        render();
      };
    };

    // ضبط ویدئوی خروجی
    const stream = canvas.captureStream(25); // 25 فریم در ثانیه
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    const chunks: BlobPart[] = [];

    recorder.ondataavailable = (e) => {
      chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'full-body-video.webm';
      a.click();
      URL.revokeObjectURL(url);
    };

    // شروع ضبط (اختیاری)
    recorder.start();

    // توقف ضبط پس از 10 ثانیه (برای تست)
    setTimeout(() => {
      recorder.stop();
    }, 10000);

    // تمیز کردن منابع
    return () => {
      cancelAnimationFrame(animationFrameId);
      video.pause();
      recorder.stop();
    };
  }, []);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <video ref={videoRef} muted style={{ display: 'none' }} />
      <canvas ref={canvasRef} style={{ border: '1px solid black' }} />
    </div>
  );
};

export default VideoAvatarCanvas;