"use client";

import { useState } from "react";
import TextField from "@atlaskit/textfield";
import Select from "@atlaskit/select";
import Button from "@atlaskit/button";

export interface FilterState {
  platform?: string;
  timeRange?: "7days" | "30days" | "90days" | "all";
  status?: "success" | "error" | "all";
}

interface FilterBarProps {
  onSearch: (text: string) => void;
  onFilterChange: (filters: FilterState) => void;
  showPlatformFilter?: boolean;
  platforms?: Array<{ label: string; value: string }>;
}

const timeRangeOptions = [
  { label: "すべての期間", value: "all" },
  { label: "過去7日間", value: "7days" },
  { label: "過去30日間", value: "30days" },
  { label: "過去90日間", value: "90days" },
];

const statusOptions = [
  { label: "すべて", value: "all" },
  { label: "成功のみ", value: "success" },
  { label: "エラーのみ", value: "error" },
];

export function FilterBar({
  onSearch,
  onFilterChange,
  showPlatformFilter = false,
  platforms = [],
}: FilterBarProps) {
  const [searchText, setSearchText] = useState("");
  const [filters, setFilters] = useState<FilterState>({
    timeRange: "all",
    status: "all",
  });

  const handleFilterUpdate = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleSearchChange = (value: string) => {
    setSearchText(value);
    onSearch(value);
  };

  return (
    <div
      style={{
        padding: "16px",
        background: "#F4F5F7",
        borderRadius: "8px",
        marginBottom: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      {/* 検索バー */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <div style={{ flex: 1 }}>
          <TextField
            type="text"
            value={searchText}
            onChange={(e) =>
              handleSearchChange((e.target as HTMLInputElement).value)
            }
            placeholder="🔍 キーワード、場所、施術名で検索..."
            style={{ width: "100%" }}
          />
        </div>
        {searchText && (
          <Button
            appearance="subtle"
            onClick={() => handleSearchChange("")}
            style={{ minWidth: "auto" }}
          >
            ✕
          </Button>
        )}
      </div>

      {/* フィルター */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: showPlatformFilter
            ? "repeat(auto-fit, minmax(150px, 1fr))"
            : "repeat(2, 1fr)",
          gap: "12px",
        }}
      >
        {showPlatformFilter && platforms.length > 0 && (
          <Select
            options={[{ label: "すべて", value: "all" }, ...platforms]}
            value={
              filters.platform
                ? platforms.find((p) => p.value === filters.platform)
                : { label: "すべて", value: "all" }
            }
            onChange={(option) => {
              if (option && "value" in option) {
                handleFilterUpdate("platform", option.value);
              }
            }}
            placeholder="プラットフォーム"
          />
        )}

        <Select
          options={timeRangeOptions}
          value={
            timeRangeOptions.find((o) => o.value === filters.timeRange) ||
            timeRangeOptions[0]
          }
          onChange={(option) => {
            if (option && "value" in option) {
              handleFilterUpdate("timeRange", option.value);
            }
          }}
          placeholder="期間"
        />

        <Select
          options={statusOptions}
          value={
            statusOptions.find((o) => o.value === filters.status) ||
            statusOptions[0]
          }
          onChange={(option) => {
            if (option && "value" in option) {
              handleFilterUpdate("status", option.value);
            }
          }}
          placeholder="ステータス"
        />
      </div>
    </div>
  );
}

