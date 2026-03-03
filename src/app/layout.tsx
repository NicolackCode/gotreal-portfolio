import type { Metadata } from 'next'
import { Syne, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const syne = Syne({
  variable: '--font-syne',
  subsets: ['latin'],
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jb-mono',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'GOTREAL - Director & DOP',
  description: "Portfolio de GOTREAL. Réalisateur, DOP et créateur visuel. Publicités, clips musicaux et films à l'esthétique Dark Cinematic.",
  icons: {
    icon: '/favicon.ico', // Assure-toi d'avoir un favicon.ico dans le dossier public
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" className={`${syne.variable} ${jetbrainsMono.variable} antialiased`}>
      <body className="bg-black text-white font-mono min-h-screen overflow-x-hidden selection:bg-white selection:text-black">
        {children}
      </body>
    </html>
  )
}

