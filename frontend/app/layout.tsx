import type { ReactNode } from 'react'
import { Suspense } from 'react'
import { Providers } from '@/components/providers'
import '@fontsource-variable/inter'
import './globals.css'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
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
