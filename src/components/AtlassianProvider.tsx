"use client";

import AppProvider from "@atlaskit/app-provider";

export function AtlassianProvider({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      {children}
    </AppProvider>
  );
}

