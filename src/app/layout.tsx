import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import { TRPCReactProvider } from "@/trpc/provider";
import { AtlassianProvider } from "@/components/AtlassianProvider";
import { Navigation } from "@/components/Navigation";

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
            <Navigation />
            {children}
          </TRPCReactProvider>
        </AtlassianProvider>
      </body>
    </html>
  );
}
