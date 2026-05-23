/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // This turns off the static on-screen route indicator completely
  devIndicators: false, 
}

export default nextConfig
