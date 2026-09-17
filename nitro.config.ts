import { defineConfig } from "nitro/config";

export default defineConfig({
  publicAssets: [
    {
      dir: "dist/client",
      maxAge: 31536000,
    },
  ],
  handlers: [
    {
      route: "/**",
      handler: "./dist/server/server.js",
    },
  ],
});
