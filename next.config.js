/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  // Dockerデプロイ用のstandalone出力（オプション）
  // output: 'standalone', // Docker使用時はコメントアウトを解除
  
  // Reactの解決を確実にするため、webpack設定を最小限に
  webpack: (config, { isServer }) => {
    // クライアント側でのみfsモジュールを無効化
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    
    return config;
  },
  
  // Prismaのバイナリファイルをビルドに含める
  experimental: {
    outputFileTracingIncludes: {
      '/api/trpc/**': [
        './src/generated/prisma/**/*.node',
        './node_modules/.prisma/client/**/*.node',
        './node_modules/@prisma/client/**/*.node',
      ],
    },
  },
};

module.exports = nextConfig;

