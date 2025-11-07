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
    
    // Reactのエイリアスを明示的に設定
    config.resolve.alias = {
      ...config.resolve.alias,
      react: require.resolve('react'),
      'react-dom': require.resolve('react-dom'),
      'react/jsx-runtime': require.resolve('react/jsx-runtime'),
      'react/jsx-dev-runtime': require.resolve('react/jsx-dev-runtime'),
    };
    
    return config;
  },
};

module.exports = nextConfig;

