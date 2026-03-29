import type { ReactNode } from 'react'
import { Inter } from 'next/font/google'
import { Suspense } from 'react'
import { Providers } from '@/components/providers'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Suspense>
          <Providers>
            {children}
          </Providers>
        </Suspense>
      </body>
    </html>
  )
}
