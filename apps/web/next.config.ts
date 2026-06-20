import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@pinecone-database/pinecone",
    "@google-cloud/bigquery",
    "google-auth-library",
    "mammoth",
  ],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error"] } : false,
  },
  devIndicators: false,
};

export default nextConfig;
