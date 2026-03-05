'use client'

import React from 'react'

export default function CarouselVideo({ url }: { url: string }) {
  return (
    <video 
      src={url}
      loop
      playsInline
      preload="metadata"
      crossOrigin="anonymous"
      className="w-full h-full object-cover opacity-50 grayscale group-hover:opacity-100 group-hover:grayscale-0 transition-all duration-700 cursor-pointer"
      onMouseEnter={(e) => { e.currentTarget.play().catch(()=>{}) }}
      onMouseLeave={(e) => { e.currentTarget.pause() }}
    />
  )
}
