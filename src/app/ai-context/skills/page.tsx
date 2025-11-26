"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import Button from "@atlaskit/button";
import TextField from "@atlaskit/textfield";
import Spinner from "@atlaskit/spinner";
import EmptyState from "@atlaskit/empty-state";
import Badge from "@atlaskit/badge";
import Select from "@atlaskit/select";
import Link from "next/link";

const complexityOptions = [
  { label: "すべて", value: "" },
  { label: "シンプル", value: "simple" },
  { label: "ミディアム", value: "medium" },
  { label: "複雑", value: "complex" },
];

const sortOptions = [
  { label: "使用回数順", value: "usageCount" },
  { label: "成功率順", value: "successRate" },
  { label: "作成日順", value: "createdAt" },
];

export default function SkillsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<"fast" | "agentic">("fast");
  const [complexity, setComplexity] = useState("");
  const [sortBy, setSortBy] = useState<"usageCount" | "successRate" | "createdAt">("usageCount");
  const [isSearching, setIsSearching] = useState(false);

  // 通常一覧
  const { data: listData, isLoading: isListLoading } = api.aiSkill.list.useQuery(
    {
      limit: 50,
      complexity: complexity ? (complexity as "simple" | "medium" | "complex") : undefined,
      sortBy,
    },
    { enabled: !isSearching }
  );

  // 検索
  const { data: searchData, isLoading: isSearchLoading, refetch: doSearch } = api.aiSkill.search.useQuery(
    { query: searchQuery, mode: searchMode, limit: 20 },
    { enabled: false }
  );

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    await doSearch();
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setIsSearching(false);
  };

  const isLoading = isSearching ? isSearchLoading : isListLoading;
  const skills = isSearching ? searchData : listData?.skills;

  return (
    <div style={{ minHeight: "100vh", background: "#F4F5F7", padding: "24px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* ヘッダー */}
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: 600, color: "#172B4D", marginBottom: "4px" }}>
            学習済みスキル
          </h1>
          <p style={{ fontSize: "14px", color: "#6B778C" }}>
            AIが会話から学習したSOP・手順を管理できます
          </p>
        </div>

        {/* 検索・フィルター */}
        <div style={{
          marginBottom: "24px",
          borderRadius: "8px",
          border: "1px solid #DFE1E6",
          background: "#FFFFFF",
          padding: "16px",
        }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
            {/* 検索 */}
            <div style={{ display: "flex", flex: 1, gap: "8px", minWidth: "300px" }}>
              <div style={{ flex: 1 }}>
                <TextField
                  value={searchQuery}
                  onChange={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
                  placeholder="スキルを検索..."
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <div style={{ width: "140px" }}>
                <Select
                  options={[
                    { label: "Fast検索", value: "fast" },
                    { label: "Agentic検索", value: "agentic" },
                  ]}
                  value={{ label: searchMode === "fast" ? "Fast検索" : "Agentic検索", value: searchMode }}
                  onChange={(opt) => {
                    const option = opt as { value: "fast" | "agentic" } | null;
                    if (option) setSearchMode(option.value);
                  }}
                />
              </div>
              <Button appearance="primary" onClick={handleSearch}>
                検索
              </Button>
              {isSearching && (
                <Button appearance="subtle" onClick={handleClearSearch}>
                  クリア
                </Button>
              )}
            </div>

            {/* フィルター（検索中は非表示） */}
            {!isSearching && (
              <div style={{ display: "flex", gap: "8px" }}>
                <div style={{ width: "130px" }}>
                  <Select
                    options={complexityOptions}
                    value={complexityOptions.find((o) => o.value === complexity)}
                    onChange={(opt) => {
                      const option = opt as { value: string } | null;
                      if (option) setComplexity(option.value);
                    }}
                    placeholder="複雑度"
                  />
                </div>
                <div style={{ width: "140px" }}>
                  <Select
                    options={sortOptions}
                    value={sortOptions.find((o) => o.value === sortBy)}
                    onChange={(opt) => {
                      const option = opt as { value: "usageCount" | "successRate" | "createdAt" } | null;
                      if (option) setSortBy(option.value);
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* スキル一覧 */}
        {isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "48px" }}>
            <Spinner size="large" />
          </div>
        ) : !skills || skills.length === 0 ? (
          <EmptyState
            header={isSearching ? "検索結果がありません" : "スキルがありません"}
            description={
              isSearching
                ? "別のキーワードで検索してみてください"
                : "AIセッションを完了すると、自動的にスキルが学習されます"
            }
          />
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(400px, 100%), 1fr))",
            gap: "16px",
          }}>
            {skills.map((skill) => (
              <Link
                key={skill.id}
                href={`/ai-context/skills/${skill.id}`}
                style={{ textDecoration: "none", display: "block" }}
              >
                <div style={{
                  height: "100%",
                  borderRadius: "8px",
                  border: "1px solid #DFE1E6",
                  background: "#FFFFFF",
                  padding: "16px",
                  transition: "box-shadow 0.2s",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "none";
                }}
                >
                  <div style={{ marginBottom: "8px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                    <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#172B4D" }}>
                      {skill.name}
                    </h3>
                    <Badge
                      appearance={
                        skill.complexity === "simple"
                          ? "added"
                          : skill.complexity === "medium"
                          ? "primary"
                          : "important"
                      }
                    >
                      {skill.complexity}
                    </Badge>
                  </div>
                  <p style={{
                    marginBottom: "12px",
                    fontSize: "14px",
                    color: "#6B778C",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}>
                    {skill.description}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "14px" }}>
                    <div style={{ display: "flex", gap: "12px", color: "#6B778C" }}>
                      <span>使用: {skill.usageCount}回</span>
                      <span>成功率: {Math.round(skill.successRate * 100)}%</span>
                    </div>
                    {"space" in skill && skill.space && (
                      <span style={{ fontSize: "12px", color: "#97A0AF" }}>
                        {(skill.space as { name: string }).name}
                      </span>
                    )}
                  </div>
                  {/* タグ */}
                  {skill.tags && Array.isArray(skill.tags) && (skill.tags as string[]).length > 0 && (
                    <div style={{ marginTop: "8px", display: "flex", flexWrap: "wrap", gap: "4px" }}>
                      {(skill.tags as string[]).slice(0, 5).map((tag, i) => (
                        <span
                          key={i}
                          style={{
                            borderRadius: "4px",
                            background: "#F4F5F7",
                            padding: "2px 8px",
                            fontSize: "12px",
                            color: "#6B778C",
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

