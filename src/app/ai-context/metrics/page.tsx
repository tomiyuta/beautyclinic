"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import Spinner from "@atlaskit/spinner";
import Select from "@atlaskit/select";

// シンプルな棒グラフコンポーネント
function SimpleBarChart({
  data,
  dataKey,
  color = "#0052CC",
}: {
  data: Array<{ date: string; [key: string]: unknown }>;
  dataKey: string;
  color?: string;
}) {
  if (data.length === 0) {
    return <p style={{ color: "#6B778C", textAlign: "center", padding: "16px" }}>データがありません</p>;
  }

  const maxValue = Math.max(...data.map((d) => (d[dataKey] as number) || 0), 1);

  return (
    <div style={{ display: "flex", height: "160px", alignItems: "flex-end", gap: "4px" }}>
      {data.map((d, i) => {
        const value = (d[dataKey] as number) || 0;
        const height = (value / maxValue) * 100;
        return (
          <div key={i} style={{ position: "relative", flex: 1 }}>
            <div
              style={{
                width: "100%",
                borderRadius: "4px 4px 0 0",
                transition: "opacity 0.2s",
                height: `${height}%`,
                backgroundColor: color,
                minHeight: value > 0 ? "4px" : "0",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "0.8";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "1";
              }}
              title={`${d.date}: ${value}`}
            />
          </div>
        );
      })}
    </div>
  );
}

export default function MetricsPage() {
  const [days, setDays] = useState(30);
  const [spaceId, setSpaceId] = useState<string | undefined>(undefined);

  const { data: spaces } = api.aiSpace.list.useQuery({ limit: 100 });
  const { data: metrics, isLoading: isMetricsLoading } = api.aiSession.getMetrics.useQuery({
    spaceId,
    metricType: "daily",
    days,
  });
  const { data: realtimeStats, isLoading: isStatsLoading } = api.aiSession.getRealtimeStats.useQuery({
    spaceId,
  });

  const isLoading = isMetricsLoading || isStatsLoading;

  // メトリクスデータを日付でグループ化
  const chartData = metrics?.map((m) => ({
    date: new Date(m.date).toLocaleDateString("ja-JP", { month: "short", day: "numeric" }),
    sessions: ((m.data as Record<string, number>)?.sessions) ?? 0,
    tasks: ((m.data as Record<string, number>)?.tasks) ?? 0,
    skills: ((m.data as Record<string, number>)?.skillsLearned) ?? 0,
    successRate: ((m.data as Record<string, number>)?.taskSuccessRate) ?? 0,
  })) ?? [];

  const spaceOptions = [
    { label: "すべてのスペース", value: "" },
    ...(spaces?.spaces.map((s) => ({ label: s.name, value: s.id })) ?? []),
  ];

  const daysOptions = [
    { label: "過去7日", value: 7 },
    { label: "過去30日", value: 30 },
    { label: "過去90日", value: 90 },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#F4F5F7", padding: "24px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* ヘッダー */}
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: 600, color: "#172B4D", marginBottom: "4px" }}>
            メトリクス
          </h1>
          <p style={{ fontSize: "14px", color: "#6B778C" }}>
            AIセッションの利用状況を可視化します
          </p>
        </div>

        {/* フィルター */}
        <div style={{ marginBottom: "24px", display: "flex", gap: "16px" }}>
          <div style={{ width: "256px" }}>
            <Select
              options={spaceOptions}
              value={spaceOptions.find((o) => o.value === (spaceId ?? ""))}
              onChange={(opt) => {
                const option = opt as { value: string } | null;
                setSpaceId(option?.value || undefined);
              }}
              placeholder="スペースを選択"
            />
          </div>
          <div style={{ width: "160px" }}>
            <Select
              options={daysOptions}
              value={daysOptions.find((o) => o.value === days)}
              onChange={(opt) => {
                const option = opt as { value: number } | null;
                if (option) setDays(option.value);
              }}
            />
          </div>
        </div>

        {isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "48px" }}>
            <Spinner size="large" />
          </div>
        ) : (
          <>
            {/* サマリーカード */}
            <div style={{
              marginBottom: "32px",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(200px, 100%), 1fr))",
              gap: "16px",
            }}>
              <div style={{
                borderRadius: "8px",
                border: "1px solid #DFE1E6",
                background: "#FFFFFF",
                padding: "16px",
              }}>
                <p style={{ fontSize: "14px", color: "#6B778C", marginBottom: "4px" }}>
                  今日のセッション
                </p>
                <p style={{ fontSize: "32px", fontWeight: 600, color: "#0052CC" }}>
                  {realtimeStats?.today.sessions ?? 0}
                </p>
              </div>
              <div style={{
                borderRadius: "8px",
                border: "1px solid #DFE1E6",
                background: "#FFFFFF",
                padding: "16px",
              }}>
                <p style={{ fontSize: "14px", color: "#6B778C", marginBottom: "4px" }}>
                  今日のタスク
                </p>
                <p style={{ fontSize: "32px", fontWeight: 600, color: "#36B37E" }}>
                  {realtimeStats?.today.tasks ?? 0}
                </p>
                <p style={{ fontSize: "12px", color: "#97A0AF", marginTop: "4px" }}>
                  成功: {realtimeStats?.today.taskSuccess ?? 0} / 失敗: {realtimeStats?.today.taskFailed ?? 0}
                </p>
              </div>
              <div style={{
                borderRadius: "8px",
                border: "1px solid #DFE1E6",
                background: "#FFFFFF",
                padding: "16px",
              }}>
                <p style={{ fontSize: "14px", color: "#6B778C", marginBottom: "4px" }}>
                  総セッション
                </p>
                <p style={{ fontSize: "32px", fontWeight: 600, color: "#172B4D" }}>
                  {realtimeStats?.total.sessions ?? 0}
                </p>
              </div>
              <div style={{
                borderRadius: "8px",
                border: "1px solid #DFE1E6",
                background: "#FFFFFF",
                padding: "16px",
              }}>
                <p style={{ fontSize: "14px", color: "#6B778C", marginBottom: "4px" }}>
                  学習済みスキル
                </p>
                <p style={{ fontSize: "32px", fontWeight: 600, color: "#6554C0" }}>
                  {realtimeStats?.total.skills ?? 0}
                </p>
                <p style={{ fontSize: "12px", color: "#97A0AF", marginTop: "4px" }}>
                  タスク成功率: {Math.round((realtimeStats?.total.taskSuccessRate ?? 0) * 100)}%
                </p>
              </div>
            </div>

            {/* グラフ */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(400px, 100%), 1fr))",
              gap: "24px",
            }}>
              {/* セッション数 */}
              <div style={{
                borderRadius: "8px",
                border: "1px solid #DFE1E6",
                background: "#FFFFFF",
                padding: "24px",
              }}>
                <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#172B4D", marginBottom: "16px" }}>
                  セッション数
                </h3>
                <SimpleBarChart data={chartData} dataKey="sessions" color="#0052CC" />
              </div>

              {/* タスク数 */}
              <div style={{
                borderRadius: "8px",
                border: "1px solid #DFE1E6",
                background: "#FFFFFF",
                padding: "24px",
              }}>
                <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#172B4D", marginBottom: "16px" }}>
                  タスク数
                </h3>
                <SimpleBarChart data={chartData} dataKey="tasks" color="#36B37E" />
              </div>

              {/* 学習スキル数 */}
              <div style={{
                borderRadius: "8px",
                border: "1px solid #DFE1E6",
                background: "#FFFFFF",
                padding: "24px",
              }}>
                <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#172B4D", marginBottom: "16px" }}>
                  学習スキル数
                </h3>
                <SimpleBarChart data={chartData} dataKey="skills" color="#6554C0" />
              </div>

              {/* 成功率 */}
              <div style={{
                borderRadius: "8px",
                border: "1px solid #DFE1E6",
                background: "#FFFFFF",
                padding: "24px",
              }}>
                <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#172B4D", marginBottom: "16px" }}>
                  タスク成功率 (%)
                </h3>
                <SimpleBarChart
                  data={chartData.map((d) => ({
                    ...d,
                    successRate: Math.round(d.successRate * 100),
                  }))}
                  dataKey="successRate"
                  color="#FF991F"
                />
              </div>
            </div>

            {/* データがない場合 */}
            {chartData.length === 0 && (
              <div style={{
                marginTop: "32px",
                borderRadius: "8px",
                border: "1px solid #DFE1E6",
                background: "#FFFFFF",
                padding: "32px",
                textAlign: "center",
              }}>
                <p style={{ color: "#6B778C" }}>
                  メトリクスデータがありません。
                  <br />
                  Cronジョブ（/api/cron/aggregate-metrics）が正常に動作しているか確認してください。
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}


