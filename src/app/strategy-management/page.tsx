import Link from "next/link";
import StrategyManagement from "@/features/strategy/strategy-management";

export default function StrategyManagementPage() {
  return (
    <main className="min-h-screen bg-zinc-50 px-4 pb-16 font-sans">
      <nav className="mx-auto flex w-full max-w-4xl items-center justify-between border-b border-zinc-200 bg-white px-4 py-4">
        <h1 className="text-lg font-semibold text-zinc-900">
          美容クリニックAI協調プラットフォーム
        </h1>
        <div className="flex gap-2 overflow-x-auto">
          <Link
            href="/"
            className="whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 sm:px-4 sm:text-sm"
          >
            商品管理
          </Link>
          <Link
            href="/market-research"
            className="whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 sm:px-4 sm:text-sm"
          >
            市場調査
          </Link>
          <Link
            href="/sns-research"
            className="whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 sm:px-4 sm:text-sm"
          >
            SNS調査
          </Link>
          <Link
            href="/strategy"
            className="whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 sm:px-4 sm:text-sm"
          >
            戦略分析
          </Link>
          <Link
            href="/content"
            className="whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 sm:px-4 sm:text-sm"
          >
            コンテンツ生成
          </Link>
          <Link
            href="/workflow"
            className="whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 sm:px-4 sm:text-sm"
          >
            ワークフロー
          </Link>
          <Link
            href="/strategy-management"
            className="whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 sm:px-4 sm:text-sm"
          >
            戦略管理
          </Link>
        </div>
      </nav>
      <StrategyManagement />
    </main>
  );
}

