/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  // Turbopackを無効化（Webpackを使用）
  // Next.js 14では環境変数で無効化可能
  webpack: (config) => {
    return config;
  },
};

module.exports = nextConfig;

