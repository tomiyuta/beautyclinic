import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import dynamic from "next/dynamic";

import { TRPCReactProvider } from "@/trpc/provider";
import { Navigation } from "@/components/Navigation";
import { ToastProvider } from "@/components/ToastProvider";

// AtlassianProviderを動的インポートしてSSRを無効化（Vercelでのfeature gateエラーを回避）
const AtlassianProvider = dynamic(
  () => import("@/components/AtlassianProvider").then((mod) => ({ default: mod.AtlassianProvider })),
  { 
    ssr: false,
    loading: () => null, // ローディング中は何も表示しない
  }
);

import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  fallback: ["system-ui", "arial"],
  adjustFontFallback: true,
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  fallback: ["monospace"],
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: "クリマケ",
  description:
    "美容クリニック向けの戦略立案・素材生成を支援するAI協調システム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
        <AtlassianProvider>
          <TRPCReactProvider>
            <ToastProvider>
              <div className="flex h-screen w-full bg-gray-50 overflow-hidden">
                {/* Sidebar Navigation */}
                <Navigation />

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto w-full relative scroll-smooth pt-16 lg:pt-0">
                  {children}
                </main>
              </div>
            </ToastProvider>
          </TRPCReactProvider>
        </AtlassianProvider>
      </body>
    </html>
  );
}
