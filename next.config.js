/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  // Dockerデプロイ用のstandalone出力（オプション）
  // output: 'standalone', // Docker使用時はコメントアウトを解除
  
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
    
    // Reactの解決を確実にする
    config.resolve.modules = [
      ...(config.resolve.modules || []),
      'node_modules',
    ];
    
    return config;
  },
};

module.exports = nextConfig;

