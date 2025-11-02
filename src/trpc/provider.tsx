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
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        httpBatchLink({
          url: typeof window !== "undefined" ? "/api/trpc" : "http://localhost:3000/api/trpc",
          transformer: superjson,
          fetch: async (url, options) => {
            const response = await fetch(url, options);
            if (!response.ok || response.status >= 400) {
              const clonedResponse = response.clone();
              const text = await clonedResponse.text();
              // HTMLが返されている場合のエラーハンドリング
              if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) {
                throw new Error(`Server returned HTML instead of JSON. Status: ${response.status}. URL: ${url}`);
              }
            }
            return response;
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

