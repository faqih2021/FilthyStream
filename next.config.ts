import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@distube/ytdl-core'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
