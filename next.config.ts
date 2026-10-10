process.env.TZ = "Asia/Jakarta";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;