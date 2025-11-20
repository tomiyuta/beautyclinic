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
  
  // Prismaのバイナリファイルをビルドに含める（Next.js 13 App Router用）
  experimental: {
    outputFileTracingIncludes: {
      '/api/trpc/**': [
        './src/generated/prisma/**/*',
        './node_modules/.prisma/client/**/*',
        './node_modules/@prisma/client/**/*',
      ],
    },
  },
};

module.exports = nextConfig;

