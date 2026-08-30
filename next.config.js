/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Emits .next/standalone with a self-contained server.js and only the
  // node_modules actually reachable from the build. This is what makes the
  // Cloud Run image small and lets the runtime stage skip `npm install`
  // entirely.
  output: "standalone",

  // The only next/image usage is a 30px logo. Optimising it needs the native
  // `sharp` binary in the runtime image; skipping optimisation removes that
  // dependency and a common Cloud Run cold-start failure, for no visual cost.
  images: { unoptimized: true },

  // Don't advertise the framework version to every caller.
  poweredByHeader: false,
};

module.exports = nextConfig;
