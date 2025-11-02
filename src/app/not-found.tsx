import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4">
      <div className="max-w-md rounded-lg border border-zinc-200 bg-white p-8 shadow-sm text-center">
        <h2 className="mb-4 text-2xl font-semibold text-zinc-900">404</h2>
        <p className="mb-6 text-sm text-zinc-600">ページが見つかりませんでした</p>
        <Link
          href="/"
          className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
        >
          ホームに戻る
        </Link>
      </div>
    </div>
  );
}

