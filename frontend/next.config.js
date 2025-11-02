/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure Turbopack uses the frontend folder as the root
  turbopack: {
    root: __dirname,
  },
  reactStrictMode: true,
};

module.exports = nextConfig;
