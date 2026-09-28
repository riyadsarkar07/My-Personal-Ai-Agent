import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.monkeycode-ai.live"],
  serverExternalPackages: ["@google/genai"],
};

export default nextConfig;
