import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // The sell form accepts up to 8 photos of 8 MB each (see
      // src/app/sell/new/actions.ts); the 1 MB default rejects a single
      // ordinary phone photo.
      bodySizeLimit: "70mb",
    },
  },
};

export default nextConfig;
