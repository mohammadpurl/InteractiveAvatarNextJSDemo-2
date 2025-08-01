import React, {
  RefObject,
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
} from "react";
import { useAtom } from "jotai"

import {
  mediaCanvasRefAtom,
  mediaStreamActiveAtom,
  mediaStreamRefAtom,
  removeBGAtom,
} from "@/lib/atoms"
import { cn } from "@/lib/utils"

const VideoWrap = forwardRef<HTMLVideoElement | null>((props, ref) => {
  const [removeBG] = useAtom(removeBGAtom)
  const [mediaStreamActive] = useAtom(mediaStreamActiveAtom)
  const [mediaStreamRef, setMediaStreamRef] = useAtom(mediaStreamRefAtom)
  const [mediaCanvasRef, setMediaCanvasRef] = useAtom(mediaCanvasRefAtom)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    setMediaStreamRef(videoRef)
    setMediaCanvasRef(canvasRef)
  }, [setMediaStreamRef, setMediaCanvasRef])

  useEffect(() => {
    if (!removeBG || !mediaStreamActive || !mediaStreamRef || !mediaCanvasRef)
      return

    const renderCanvas = () => {
      const video = mediaStreamRef.current
      const canvas = mediaCanvasRef.current

      if (!canvas || !video) return
      const ctx = canvas.getContext("2d", { willReadFrequently: true })

      if (!ctx) return

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data

      for (let i = 0; i < data.length; i += 4) {
        const red = data[i]
        const green = data[i + 1]
        const blue = data[i + 2]

        if (isCloseToGreen([red, green, blue])) {
          data[i + 3] = 0 // Set alpha channel to 0 (transparent)
        }
      }

      ctx.putImageData(imageData, 0, 0)

      return requestAnimationFrame(renderCanvas) // Return the request ID
    }

    const isCloseToGreen = (color: number[]) => {
      const [red, green, blue] = color
      const th = 90 // Adjust the threshold values for green detection

      return green > th && red < th && blue < th
    }

    const animationFrameId = renderCanvas() // Start the animation loop

    // Clean up function to cancel animation frame
    return () => cancelAnimationFrame(animationFrameId!)
  }, [removeBG, mediaStreamActive])

  // این بخش ref را به videoRef متصل می‌کند
  useImperativeHandle<HTMLVideoElement | null, HTMLVideoElement | null>(
    ref,
    () => videoRef.current,
  );

  return (
    <div id="videoWrap" className={cn(!mediaStreamActive && "hidden")}>
      <video
        playsInline
        autoPlay
        // width={500}
        ref={videoRef}
        className={cn("max-h-[500px] w-full", removeBG ? "hidden" : "flex")}
       />
      <canvas
        ref={canvasRef}
        className={cn("max-h-[500px] w-full", !removeBG ? "hidden" : "flex")}
       />
    </div>
  )
})

export default VideoWrap
