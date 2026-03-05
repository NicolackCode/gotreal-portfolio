'use client'

import React, { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'

export default function HeroVideoBackground({ videoUrls }: { videoUrls: string[] }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [currentUrl, setCurrentUrl] = useState<string>('')

  useEffect(() => {
    if (videoUrls && videoUrls.length > 0) {
       const randomIndex = Math.floor(Math.random() * videoUrls.length)
       setCurrentUrl(videoUrls[randomIndex])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !currentUrl) return

    let hls: Hls | null = null

    if (Hls.isSupported() && currentUrl.includes('.m3u8')) {
      hls = new Hls({ autoStartLoad: true })
      hls.loadSource(currentUrl)
      hls.attachMedia(video)
      
      hls.on(Hls.Events.MANIFEST_PARSED, function () {
         video.play().catch(e => console.warn("Auto-play prevented", e))
      })
    } else {
      // Fallback for native Safari or generic MP4s
      video.src = currentUrl
      video.play().catch(e => console.warn("Auto-play prevented", e))
    }

    return () => {
      if (hls) {
        hls.destroy()
      }
    }
  }, [currentUrl])

  return (
    <video 
      ref={videoRef}
      autoPlay 
      loop 
      muted 
      playsInline
      crossOrigin="anonymous"
      className="w-full h-full object-cover"
    />
  )
}
