import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Output standalone for Docker and other deployment options
  output: "standalone",

  // Optimize images
  images: {
    unoptimized: true,
  },

  // Production optimizations
  compress: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,

  // Experimental features for better performance
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
