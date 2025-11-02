import Link from "next/link";
import SNSResearch from "@/features/sns-research/sns-research";

export default function SNSResearchPage() {
  return (
    <main className="min-h-screen bg-zinc-50 px-4 pb-16 font-sans">
      <nav className="mx-auto flex w-full max-w-4xl items-center justify-between border-b border-zinc-200 bg-white px-4 py-4">
        <h1 className="text-lg font-semibold text-zinc-900">
          美容クリニックAI協調プラットフォーム
        </h1>
        <div className="flex gap-4">
          <Link
            href="/"
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
          >
            商品管理
          </Link>
          <Link
            href="/market-research"
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
          >
            市場調査
          </Link>
          <Link
            href="/sns-research"
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
          >
            SNS調査
          </Link>
          <Link
            href="/strategy"
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
          >
            戦略分析
          </Link>
          <Link
            href="/content"
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
          >
            コンテンツ生成
          </Link>
        </div>
      </nav>
      <SNSResearch />
    </main>
  );
}

