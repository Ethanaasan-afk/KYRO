/** @type {import('next').NextConfig} */
const nextConfig = {
  // Lets a second dev server (e.g. demo mode on another port) use its own cache
  // instead of corrupting the main one: NEXT_DIST_DIR=.next-demo next dev -p 3002
  distDir: process.env.NEXT_DIST_DIR || ".next",
  eslint: {
    // Disables ESLint errors during production builds on Vercel
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
