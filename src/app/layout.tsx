import type { Metadata } from 'next'
import { Space_Grotesk, Inter } from 'next/font/google'
import InitialLoader from '@/components/ui/InitialLoader'
import { TransitionProvider } from '@/components/transition/TransitionContext'
import './globals.css'

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
  display: 'swap',
})

const inter = Inter({
  variable: '--font-inter',
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
    <html lang="fr" suppressHydrationWarning className={`${spaceGrotesk.variable} ${inter.variable} antialiased`}>
      <body className="bg-black text-white font-sans min-h-screen overflow-x-hidden selection:bg-white selection:text-black">
        <TransitionProvider>
          <InitialLoader />
          {children}
        </TransitionProvider>
      </body>
    </html>
  )
}
