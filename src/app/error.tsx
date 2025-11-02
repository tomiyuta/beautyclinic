"use client";

import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // エラーをログに記録
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4">
      <div className="max-w-md rounded-lg border border-zinc-200 bg-white p-8 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-zinc-900">エラーが発生しました</h2>
        <p className="mb-6 text-sm text-zinc-600">{error.message || "予期しないエラーが発生しました"}</p>
        <button
          onClick={reset}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
        >
          もう一度試す
        </button>
      </div>
    </div>
  );
}

