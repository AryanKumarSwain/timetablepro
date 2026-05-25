import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Turns off the static on-screen route indicator completely
  devIndicators: false, 
  
  // Securely pins the Turbopack engine to this exact project folder
  turbopack: {
    root: __dirname,
  },

  // FIXED FOR NEWER NEXT.JS: Moved to a top-level key to pass configuration schema validation
  allowedDevOrigins: ['10.219.166.35', 'localhost:3000'],
}

export default nextConfig;
