import type { NextConfig } from "next";

// Set NEXT_PUBLIC_BASE_PATH=/<repo-name> when hosting under a GitHub Pages project URL
// (https://<user>.github.io/<repo-name>/). The deploy workflow sets this automatically.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
