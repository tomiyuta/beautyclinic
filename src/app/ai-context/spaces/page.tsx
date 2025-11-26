"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import Button from "@atlaskit/button";
import TextField from "@atlaskit/textfield";
import Spinner from "@atlaskit/spinner";
import EmptyState from "@atlaskit/empty-state";
import Badge from "@atlaskit/badge";
import Modal, {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTransition,
} from "@atlaskit/modal-dialog";
import Link from "next/link";

export default function SpacesPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const { data, isLoading, refetch } = api.aiSpace.list.useQuery({ limit: 50 });
  const createMutation = api.aiSpace.create.useMutation({
    onSuccess: () => {
      refetch();
      setIsCreateOpen(false);
      setNewName("");
      setNewDescription("");
    },
  });

  const handleCreate = () => {
    if (!newName.trim()) return;
    createMutation.mutate({
      name: newName.trim(),
      description: newDescription.trim() || undefined,
    });
  };

  if (isLoading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
        <Spinner size="large" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F4F5F7", padding: "24px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* ヘッダー */}
        <div style={{ marginBottom: "24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: 600, color: "#172B4D", marginBottom: "4px" }}>
              スペース管理
            </h1>
            <p style={{ fontSize: "14px", color: "#6B778C" }}>
              スペースごとにセッションとスキルを整理できます
            </p>
          </div>
          <Button appearance="primary" onClick={() => setIsCreateOpen(true)}>
            新規スペース作成
          </Button>
        </div>

        {/* スペース一覧 */}
        {data?.spaces.length === 0 ? (
          <EmptyState
            header="スペースがありません"
            description="最初のスペースを作成して、AIセッションを整理しましょう"
            primaryAction={
              <Button appearance="primary" onClick={() => setIsCreateOpen(true)}>
                スペースを作成
              </Button>
            }
          />
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(300px, 100%), 1fr))",
            gap: "16px",
          }}>
            {data?.spaces.map((space) => (
              <Link
                key={space.id}
                href={`/ai-context/spaces/${space.id}`}
                style={{ textDecoration: "none", display: "block" }}
              >
                <div style={{
                  borderRadius: "8px",
                  border: "1px solid #DFE1E6",
                  background: "#FFFFFF",
                  padding: "16px",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                  transition: "box-shadow 0.2s",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.05)";
                }}
                >
                  <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#172B4D", marginBottom: "8px" }}>
                    {space.name}
                  </h3>
                  {space.description && (
                    <p style={{
                      fontSize: "14px",
                      color: "#6B778C",
                      marginBottom: "12px",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}>
                      {space.description}
                    </p>
                  )}
                  <div style={{ display: "flex", gap: "12px", fontSize: "14px" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <Badge appearance="primary">{space._count.sessions}</Badge>
                      セッション
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <Badge appearance="added">{space._count.skills}</Badge>
                      スキル
                    </span>
                  </div>
                  <p style={{ marginTop: "12px", fontSize: "12px", color: "#97A0AF" }}>
                    作成: {new Date(space.createdAt).toLocaleDateString("ja-JP")}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* 作成モーダル */}
        <ModalTransition>
          {isCreateOpen && (
            <Modal onClose={() => setIsCreateOpen(false)}>
              <ModalHeader>
                <ModalTitle>新規スペース作成</ModalTitle>
              </ModalHeader>
              <ModalBody>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: 500 }}>
                      スペース名 *
                    </label>
                    <TextField
                      value={newName}
                      onChange={(e) =>
                        setNewName((e.target as HTMLInputElement).value)
                      }
                      placeholder="例: 美容クリニックマーケティング"
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: 500 }}>
                      説明
                    </label>
                    <TextField
                      value={newDescription}
                      onChange={(e) =>
                        setNewDescription((e.target as HTMLInputElement).value)
                      }
                      placeholder="スペースの用途を記載"
                    />
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button appearance="subtle" onClick={() => setIsCreateOpen(false)}>
                  キャンセル
                </Button>
                <Button
                  appearance="primary"
                  onClick={handleCreate}
                  isLoading={createMutation.isPending}
                  isDisabled={!newName.trim()}
                >
                  作成
                </Button>
              </ModalFooter>
            </Modal>
          )}
        </ModalTransition>
      </div>
    </div>
  );
}

