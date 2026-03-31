import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Backend API is on port 3000; frontend on 3001
  rewrites: async () => [
    {
      source: '/api/:path*',
      destination: 'http://localhost:3000/api/:path*',
    },
    {
      source: '/github/:path*',
      destination: 'http://localhost:3000/github/:path*',
    },
  ],
}

export default nextConfig
