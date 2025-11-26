"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import Button from "@atlaskit/button";
import Spinner from "@atlaskit/spinner";
import Badge from "@atlaskit/badge";
import Tabs, { Tab, TabList, TabPanel } from "@atlaskit/tabs";
import Link from "next/link";
import { useConfirmModal } from "@/components/ConfirmModal";

export default function SpaceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const confirmModal = useConfirmModal();
  const spaceId = params.id as string;

  const { data: space, isLoading } = api.aiSpace.get.useQuery({ id: spaceId });
  const deleteMutation = api.aiSpace.delete.useMutation({
    onSuccess: () => router.push("/ai-context/spaces"),
  });

  const handleDelete = () => {
    confirmModal.showConfirm(
      "スペースの削除",
      "このスペースを削除しますか？関連するスキルも削除されます。",
      () => {
        deleteMutation.mutate({ id: spaceId });
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

  if (!space) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
        <p>スペースが見つかりません</p>
      </div>
    );
  }

  return (
    <>
      {confirmModal.Modal}
      <div style={{ minHeight: "100vh", background: "#F4F5F7", padding: "24px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          {/* ヘッダー */}
          <div style={{ marginBottom: "24px" }}>
            <Link
              href="/ai-context/spaces"
              style={{ display: "inline-block", marginBottom: "8px", fontSize: "14px", color: "#0052CC", textDecoration: "none" }}
            >
              ← スペース一覧に戻る
            </Link>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <h1 style={{ fontSize: "24px", fontWeight: 600, color: "#172B4D", marginBottom: "4px" }}>
                  {space.name}
                </h1>
                {space.description && (
                  <p style={{ fontSize: "14px", color: "#6B778C", marginTop: "4px" }}>
                    {space.description}
                  </p>
                )}
                <div style={{ marginTop: "8px", display: "flex", gap: "16px", fontSize: "14px", color: "#6B778C" }}>
                  <span>セッション: {space._count.sessions}</span>
                  <span>スキル: {space._count.skills}</span>
                  <span>
                    作成: {new Date(space.createdAt).toLocaleDateString("ja-JP")}
                  </span>
                </div>
              </div>
              <Button appearance="danger" onClick={handleDelete}>
                削除
              </Button>
            </div>
          </div>

          {/* タブ */}
          <Tabs id="space-tabs">
            <TabList>
              <Tab>セッション ({space.sessions.length})</Tab>
              <Tab>スキル ({space.skills.length})</Tab>
            </TabList>

            <TabPanel>
              <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                {space.sessions.length === 0 ? (
                  <p style={{ padding: "32px", textAlign: "center", color: "#6B778C" }}>
                    セッションがありません
                  </p>
                ) : (
                  space.sessions.map((session) => (
                    <div
                      key={session.id}
                      style={{
                        borderRadius: "8px",
                        border: "1px solid #DFE1E6",
                        background: "#FFFFFF",
                        padding: "16px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                          <h4 style={{ fontSize: "16px", fontWeight: 500, color: "#172B4D", marginBottom: "4px" }}>
                            {session.title ?? "無題のセッション"}
                          </h4>
                          <p style={{ fontSize: "14px", color: "#6B778C" }}>
                            メッセージ: {session._count.messages} / タスク: {session._count.tasks}
                          </p>
                        </div>
                        <Badge
                          appearance={
                            session.status === "active"
                              ? "primary"
                              : session.status === "completed"
                              ? "added"
                              : "default"
                          }
                        >
                          {session.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabPanel>

            <TabPanel>
              <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                {space.skills.length === 0 ? (
                  <p style={{ padding: "32px", textAlign: "center", color: "#6B778C" }}>
                    学習済みスキルがありません
                  </p>
                ) : (
                  space.skills.map((skill) => (
                    <Link
                      key={skill.id}
                      href={`/ai-context/skills/${skill.id}`}
                      style={{ textDecoration: "none", display: "block" }}
                    >
                      <div style={{
                        borderRadius: "8px",
                        border: "1px solid #DFE1E6",
                        background: "#FFFFFF",
                        padding: "16px",
                        transition: "box-shadow 0.2s",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = "none";
                      }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div>
                            <h4 style={{ fontSize: "16px", fontWeight: 500, color: "#172B4D", marginBottom: "4px" }}>
                              {skill.name}
                            </h4>
                            <p style={{
                              fontSize: "14px",
                              color: "#6B778C",
                              display: "-webkit-box",
                              WebkitLineClamp: 1,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}>
                              {skill.description}
                            </p>
                          </div>
                          <div style={{ textAlign: "right", fontSize: "14px" }}>
                            <Badge>{skill.complexity}</Badge>
                            <p style={{ marginTop: "4px", color: "#6B778C" }}>
                              使用: {skill.usageCount}回
                            </p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </TabPanel>
          </Tabs>
        </div>
      </div>
    </>
  );
}

