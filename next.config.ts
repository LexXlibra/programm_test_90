import { createRequire } from "node:module";
import path from "node:path";
import type { NextConfig } from "next";

const require = createRequire(import.meta.url);

const nextConfig: NextConfig = {
  output: process.platform === "win32" ? undefined : "standalone",
  poweredByHeader: false,
  allowedDevOrigins: ["*.app.github.dev"],
  webpack(config) {
    // Webpack formats an absolute Windows path as a relative request when
    // node_modules lives on another drive. Alias Next's two generated entries.
    const entries = ["next", "app-next", "next-dev", "app-next-dev"];
    for (const entry of entries) {
      const target = require.resolve(`next/dist/client/${entry}.js`);
      const relative = path.win32.relative(process.cwd(), target);
      if (/^[A-Z]:\\/i.test(relative)) {
        config.resolve.alias = {
          ...config.resolve.alias,
          [`./${relative.replaceAll("\\", "/")}$`]: target,
        };
      }
    }
    return config;
  },
};

export default nextConfig;
