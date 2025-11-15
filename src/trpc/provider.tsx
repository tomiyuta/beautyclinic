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
              // 404エラーや認証エラーはリトライしない
              if (error && typeof error === "object") {
                // tRPCエラーのcodeをチェック
                if ("code" in error) {
                  const code = error.code as string;
                  if (code === "NOT_FOUND" || code === "UNAUTHORIZED") {
                    return false;
                  }
                }
                // httpStatusをチェック（存在する場合のみ）
                if ("data" in error && error.data && typeof error.data === "object") {
                  const errorData = error.data as { httpStatus?: number };
                  if (errorData.httpStatus === 404 || errorData.httpStatus === 401) {
                    return false;
                  }
                }
              }
              // 最大3回までリトライ
              return failureCount < 3;
            },
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
          },
          mutations: {
            retry: false,
            onError: (error) => {
              console.error("Mutation error:", error);
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

