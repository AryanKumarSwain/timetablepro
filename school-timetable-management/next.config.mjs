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
  
  // FIXED FOR NEXT.JS 15/16: Securely pins the Turbopack engine to this exact project folder
  turbopack: {
    root: __dirname,
  },
}

export default nextConfig;
