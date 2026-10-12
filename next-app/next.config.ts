import type { NextConfig } from "next"

const nestApiOrigin = (
  process.env.NEST_API_INTERNAL_URL ?? "http://localhost:3001"
).replace(/\/+$/, "")

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/backend/:path*",
        destination: `${nestApiOrigin}/:path*`,
      },
    ]
  },
}

export default nextConfig
