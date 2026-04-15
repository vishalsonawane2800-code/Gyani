/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove output: 'standalone' - opennextjs-cloudflare handles output generation
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
