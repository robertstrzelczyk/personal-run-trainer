import type { NextConfig } from "next";

const mobileBuild = process.env.NEXT_PUBLIC_MOBILE_BUILD === "1";

const nextConfig: NextConfig = {
  ...(mobileBuild
    ? { output: "export" as const, images: { unoptimized: true } }
    : { cacheComponents: true, partialPrefetching: true }),
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
