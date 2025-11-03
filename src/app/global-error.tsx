"use client";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="ja">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4">
          <div className="max-w-md rounded-lg border border-red-200 bg-red-50 p-8 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold text-red-900">重大なエラーが発生しました</h2>
            <p className="mb-6 text-sm text-red-800">
              {error?.message || "予期しないエラーが発生しました"}
            </p>
            {error?.digest && (
              <p className="mb-4 text-xs text-red-600">エラーID: {error.digest}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={reset}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500"
              >
                もう一度試す
              </button>
              <button
                onClick={() => window.location.href = "/"}
                className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
              >
                ホームに戻る
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

