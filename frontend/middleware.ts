import { NextRequest, NextResponse } from 'next/server'

// Protected path prefixes
const PROTECTED = ['/dashboard', '/repos', '/leaderboard', '/pull-requests', '/developers']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isProtected = PROTECTED.some(prefix => pathname.startsWith(prefix))
  if (!isProtected) return NextResponse.next()

  // Note: access token is in localStorage (client-side only).
  // Middleware checks for a cookie set at login as a fallback.
  // If no auth cookie, redirect to login.
  const hasAuthCookie = request.cookies.has('auth_present')
  if (!hasAuthCookie) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/repos/:path*', '/leaderboard/:path*', '/pull-requests/:path*', '/developers/:path*'],
}
