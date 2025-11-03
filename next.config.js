/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  // Turbopackを無効化（Webpackを使用）
  // Next.js 14では環境変数で無効化可能
  webpack: (config, { isServer }) => {
    // Reactの重複解決を防ぐ
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    
    // Reactのエイリアスを明示的に設定
    config.resolve.alias = {
      ...config.resolve.alias,
      react: require.resolve('react'),
      'react-dom': require.resolve('react-dom'),
    };
    
    return config;
  },
};

module.exports = nextConfig;

