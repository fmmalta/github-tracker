import { NextRequest, NextResponse } from 'next/server'

// Protected path prefixes
const PROTECTED = ['/', '/repos', '/leaderboard', '/pull-requests', '/developers', '/admin']
const PUBLIC = ['/auth', '/_next', '/favicon']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isPublic = PUBLIC.some(prefix => pathname.startsWith(prefix))
  if (isPublic) return NextResponse.next()

  const isProtected = PROTECTED.some(prefix => pathname === prefix || (prefix !== '/' && pathname.startsWith(prefix)))
  if (!isProtected) return NextResponse.next()

  // Note: access token is in localStorage (client-side only).
  // Middleware checks for a cookie set at login as a fallback.
  // If no auth cookie, redirect to login.
  const hasAuthCookie = request.cookies.has('auth_present')
  if (!hasAuthCookie) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next|favicon|auth).*)'],
}
