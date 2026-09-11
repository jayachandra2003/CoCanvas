/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Prevents double mount teardown loops with WebRTC peer connections in development
  webpack: (config) => {
    // Handling yjs / y-webrtc / websocket client bundling cleanly
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

export default nextConfig;
