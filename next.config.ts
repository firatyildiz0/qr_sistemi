import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  images: {
    // Product images live in the public `product-images` storage bucket.
    remotePatterns: supabaseUrl
      ? [new URL(`${supabaseUrl}/storage/v1/object/public/product-images/**`)]
      : [],
  },
};

export default nextConfig;
