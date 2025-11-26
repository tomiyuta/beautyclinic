"use client";

import { useParams, useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import Button from "@atlaskit/button";
import Spinner from "@atlaskit/spinner";
import Badge from "@atlaskit/badge";
import Link from "next/link";
import { useConfirmModal } from "@/components/ConfirmModal";

export default function SkillDetailPage() {
  const params = useParams();
  const router = useRouter();
  const confirmModal = useConfirmModal();
  const skillId = params.id as string;

  const { data: skill, isLoading } = api.aiSkill.get.useQuery({ id: skillId });
  const deleteMutation = api.aiSkill.delete.useMutation({
    onSuccess: () => router.push("/ai-context/skills"),
  });

  const handleDelete = () => {
    confirmModal.showConfirm(
      "スキルの削除",
      "このスキルを削除しますか？",
      () => {
        deleteMutation.mutate({ id: skillId });
      },
      {
        appearance: "danger",
        confirmLabel: "削除する",
        cancelLabel: "キャンセル",
      }
    );
  };

  if (isLoading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
        <Spinner size="large" />
      </div>
    );
  }

  if (!skill) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
        <p>スキルが見つかりません</p>
      </div>
    );
  }

  const steps = skill.steps as Array<{
    order: number;
    action: string;
    tool?: string;
    description?: string;
  }>;

  return (
    <>
      {confirmModal.Modal}
      <div style={{ minHeight: "100vh", background: "#F4F5F7", padding: "24px" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          {/* ヘッダー */}
          <div style={{ marginBottom: "24px" }}>
            <Link
              href="/ai-context/skills"
              style={{ display: "inline-block", marginBottom: "8px", fontSize: "14px", color: "#0052CC", textDecoration: "none" }}
            >
              ← スキル一覧に戻る
            </Link>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                  <h1 style={{ fontSize: "24px", fontWeight: 600, color: "#172B4D" }}>
                    {skill.name}
                  </h1>
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
                <p style={{ fontSize: "14px", color: "#6B778C" }}>
                  {skill.description}
                </p>
              </div>
              <Button appearance="danger" onClick={handleDelete}>
                削除
              </Button>
            </div>
          </div>

          {/* 統計 */}
          <div style={{
            marginBottom: "24px",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "16px",
          }}>
            <div style={{
              borderRadius: "8px",
              border: "1px solid #DFE1E6",
              background: "#FFFFFF",
              padding: "16px",
              textAlign: "center",
            }}>
              <p style={{ fontSize: "24px", fontWeight: 600, color: "#0052CC", marginBottom: "4px" }}>
                {skill.usageCount}
              </p>
              <p style={{ fontSize: "14px", color: "#6B778C" }}>使用回数</p>
            </div>
            <div style={{
              borderRadius: "8px",
              border: "1px solid #DFE1E6",
              background: "#FFFFFF",
              padding: "16px",
              textAlign: "center",
            }}>
              <p style={{ fontSize: "24px", fontWeight: 600, color: "#36B37E", marginBottom: "4px" }}>
                {Math.round((skill.successRate ?? 0) * 100)}%
              </p>
              <p style={{ fontSize: "14px", color: "#6B778C" }}>成功率</p>
            </div>
            <div style={{
              borderRadius: "8px",
              border: "1px solid #DFE1E6",
              background: "#FFFFFF",
              padding: "16px",
              textAlign: "center",
            }}>
              <p style={{ fontSize: "24px", fontWeight: 600, color: "#6B778C", marginBottom: "4px" }}>
                {steps.length}
              </p>
              <p style={{ fontSize: "14px", color: "#6B778C" }}>ステップ数</p>
            </div>
          </div>

          {/* 手順 */}
          <div style={{
            marginBottom: "24px",
            borderRadius: "8px",
            border: "1px solid #DFE1E6",
            background: "#FFFFFF",
            padding: "24px",
          }}>
            <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#172B4D", marginBottom: "16px" }}>
              手順（SOP）
            </h2>
            <ol style={{ display: "flex", flexDirection: "column", gap: "16px", padding: 0, margin: 0, listStyle: "none" }}>
              {steps.map((step) => (
                <li key={step.order} style={{ display: "flex", gap: "16px" }}>
                  <div style={{
                    display: "flex",
                    height: "32px",
                    width: "32px",
                    flexShrink: 0,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "50%",
                    background: "#E3FCEF",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "#0052CC",
                  }}>
                    {step.order}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: "16px", fontWeight: 500, color: "#172B4D", marginBottom: "4px" }}>
                      {step.action}
                    </p>
                    {step.tool && (
                      <p style={{ marginTop: "4px", fontSize: "14px", color: "#6B778C" }}>
                        ツール: <code style={{
                          borderRadius: "4px",
                          background: "#F4F5F7",
                          padding: "2px 6px",
                          fontSize: "12px",
                        }}>{step.tool}</code>
                      </p>
                    )}
                    {step.description && (
                      <p style={{ marginTop: "4px", fontSize: "14px", color: "#6B778C" }}>
                        {step.description}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* タグ */}
          {skill.tags && Array.isArray(skill.tags) && (skill.tags as string[]).length > 0 && (
            <div style={{
              marginBottom: "24px",
              borderRadius: "8px",
              border: "1px solid #DFE1E6",
              background: "#FFFFFF",
              padding: "24px",
            }}>
              <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#172B4D", marginBottom: "12px" }}>
                タグ
              </h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {(skill.tags as string[]).map((tag, i) => (
                  <span
                    key={i}
                    style={{
                      borderRadius: "16px",
                      background: "#F4F5F7",
                      padding: "4px 12px",
                      fontSize: "14px",
                      color: "#6B778C",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* メタ情報 */}
          <div style={{
            borderRadius: "8px",
            border: "1px solid #DFE1E6",
            background: "#FFFFFF",
            padding: "24px",
          }}>
            <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#172B4D", marginBottom: "12px" }}>
              メタ情報
            </h2>
            <dl style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "16px",
              fontSize: "14px",
            }}>
              <div>
                <dt style={{ color: "#6B778C", marginBottom: "4px" }}>スペース</dt>
                <dd style={{ fontWeight: 500, color: "#172B4D" }}>{skill.space?.name ?? "-"}</dd>
              </div>
              <div>
                <dt style={{ color: "#6B778C", marginBottom: "4px" }}>作成日</dt>
                <dd style={{ fontWeight: 500, color: "#172B4D" }}>
                  {new Date(skill.createdAt).toLocaleDateString("ja-JP")}
                </dd>
              </div>
              <div>
                <dt style={{ color: "#6B778C", marginBottom: "4px" }}>更新日</dt>
                <dd style={{ fontWeight: 500, color: "#172B4D" }}>
                  {new Date(skill.updatedAt).toLocaleDateString("ja-JP")}
                </dd>
              </div>
              <div>
                <dt style={{ color: "#6B778C", marginBottom: "4px" }}>ID</dt>
                <dd style={{ fontFamily: "monospace", fontSize: "12px", color: "#97A0AF" }}>
                  {skill.id}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </>
  );
}

