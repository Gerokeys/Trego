import type { NextConfig } from "next";

// With a public R2 bucket, photo URLs are absolute, and next/image only
// optimises remote images from hosts listed here.
const r2PublicHost = process.env.R2_PUBLIC_BASE_URL?.trim()
  ? new URL(process.env.R2_PUBLIC_BASE_URL).hostname
  : null;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: r2PublicHost ? [{ protocol: "https", hostname: r2PublicHost }] : [],
  },
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
