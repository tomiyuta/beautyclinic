"use client";

import { httpBatchLink } from "@trpc/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import superjson from "superjson";

import { api } from "./react";

export function TRPCReactProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 1000,
            retry: (failureCount, error) => {
              try {
                // エラーオブジェクトの構造を確認
                if (error && typeof error === "object") {
                  // tRPCエラーの場合、dataプロパティをチェック
                  if ("data" in error && error.data) {
                    const errorData = error.data as { httpStatus?: number; code?: string };
                    if (errorData && typeof errorData === "object") {
                      // HTTPステータスコードをチェック
                      if ("httpStatus" in errorData) {
                        const httpStatus = errorData.httpStatus;
                        // 404エラーや認証エラーはリトライしない
                        if (httpStatus === 404 || httpStatus === 401) {
                          return false;
                        }
                      }
                      // tRPCエラーコードをチェック
                      if ("code" in errorData) {
                        const code = errorData.code;
                        // NOT_FOUNDやUNAUTHORIZEDはリトライしない
                        if (code === "NOT_FOUND" || code === "UNAUTHORIZED") {
                          return false;
                        }
                      }
                    }
                  }
                  
                  // ネットワークエラー（エラーコード-102など）をチェック
                  if ("cause" in error && error.cause) {
                    const cause = error.cause as { code?: number | string; message?: string };
                    if (cause && typeof cause === "object") {
                      // エラーコード-102はネットワークエラー（接続失敗）
                      if (cause.code === -102 || cause.code === "ECONNREFUSED" || cause.code === "ERR_NETWORK") {
                        // ネットワークエラーは最大3回リトライ
                        return failureCount < 3;
                      }
                    }
                  }
                  
                  // エラーメッセージからネットワークエラーを検出
                  const errorMessage = String(error.message || "").toLowerCase();
                  if (errorMessage.includes("network") || 
                      errorMessage.includes("fetch") || 
                      errorMessage.includes("connection") ||
                      errorMessage.includes("failed to fetch")) {
                    // ネットワークエラーは最大3回リトライ
                    return failureCount < 3;
                  }
                }
              } catch (retryError) {
                // リトライ判定中にエラーが発生した場合はログに記録して続行
                console.warn("Error in retry logic:", retryError);
              }
              // デフォルト：最大3回までリトライ
              return failureCount < 3;
            },
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
          },
          mutations: {
            retry: false,
            onError: (error) => {
              console.error("Mutation error:", error);
              // ネットワークエラーの場合は詳細をログに記録
              if (error && typeof error === "object") {
                const errorMessage = String(error.message || "").toLowerCase();
                if (errorMessage.includes("network") || 
                    errorMessage.includes("fetch") || 
                    errorMessage.includes("connection") ||
                    errorMessage.includes("failed to fetch")) {
                  console.error("Network error detected. Please check if the server is running.");
                }
              }
            },
          },
        },
      }),
  );
  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        httpBatchLink({
          url: typeof window !== "undefined" ? "/api/trpc" : "http://localhost:3000/api/trpc",
          transformer: superjson,
          headers: () => {
            return {};
          },
        }),
      ],
    }),
  );

  return (
    <api.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </api.Provider>
  );
}

