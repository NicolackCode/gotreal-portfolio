'use client'

import React from 'react'

export default function CarouselVideo({ url }: { url: string }) {
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      <video 
        src={url}
        loop
        playsInline
        preload="metadata"
        crossOrigin="anonymous"
        // Le transform-gpu force l'accélération matérielle, décisif pour les bugs Webkit
        className="w-full h-full object-cover opacity-50 grayscale group-hover:opacity-100 group-hover:grayscale-0 transition-all duration-700 cursor-pointer transform-gpu"
        onMouseEnter={(e) => { e.currentTarget.play().catch(()=>{}) }}
        onMouseLeave={(e) => { e.currentTarget.pause() }}
      />
    </div>
  )
}
