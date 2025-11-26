"use client";

import { useState } from "react";
import Button from "@atlaskit/button";
import Spinner from "@atlaskit/spinner";
import Badge from "@atlaskit/badge";
import TextField from "@atlaskit/textfield";
import EmptyState from "@atlaskit/empty-state";
import { api } from "@/trpc/react";

export default function AcontextDashboardPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const utils = api.useUtils();

  // セッション一覧
  const { data: sessions, isLoading: isLoadingSessions } =
    api.aiSession.list.useQuery({ limit: 20 });

  // メッセージ取得
  const { data: messages, isLoading: isLoadingMessages } =
    api.aiSession.getMessages.useQuery(
      { sessionId: sessionId! },
      { enabled: !!sessionId },
    );

  // タスク取得
  const { data: tasks, isLoading: isLoadingTasks } =
    api.aiSession.getTasks.useQuery(
      { sessionId: sessionId! },
      { enabled: !!sessionId },
    );

  // セッション作成
  const createSession = api.aiSession.create.useMutation({
    onSuccess: (session) => {
      setSessionId(session.id);
      void utils.aiSession.list.invalidate();
    },
  });

  // メッセージ送信
  const sendMessage = api.aiSession.sendMessage.useMutation({
    onSuccess: () => {
      setMessage("");
      if (sessionId) {
        void utils.aiSession.getMessages.invalidate({ sessionId });
      }
    },
  });

  // flush()実行（タスク抽出のみ）
  const flush = api.aiSession.flush.useMutation({
    onSuccess: (_, variables) => {
      void utils.aiSession.getTasks.invalidate({ sessionId: variables.sessionId });
    },
  });

  const handleCreateSession = () => {
    createSession.mutate({
      title: `新しいセッション - ${new Date().toLocaleString()}`,
    });
  };

  const handleSendMessage = async () => {
    if (!sessionId || !message.trim()) return;

    await sendMessage.mutateAsync({
      sessionId,
      role: "user",
      content: message,
    });
  };

  const handleFlush = async () => {
    if (!sessionId) return;

    await flush.mutateAsync({
      sessionId,
      timeoutMs: 30000,
      jobType: "task_extraction",
    });
  };

  return (
    <main style={{ minHeight: "100vh", background: "#F4F5F7", padding: "16px" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "48px 16px" }}>
        <header style={{ marginBottom: "40px" }}>
          <h1
            style={{
              fontSize: "24px",
              fontWeight: 600,
              margin: 0,
              marginBottom: "8px",
              color: "#172B4D",
            }}
          >
            Acontextダッシュボード
          </h1>
          <p style={{ fontSize: "14px", color: "#6B778C", margin: 0 }}>
            会話セッションを作成し、タスク抽出結果を一覧できます。OpenAIのAPIキーは「API Key設定」で入力した値がそのまま利用されます。
          </p>
        </header>

        {/* セッション作成ボタン */}
        <section style={{ marginBottom: "24px" }}>
          <Button
            appearance="primary"
            onClick={handleCreateSession}
            isDisabled={createSession.isPending}
          >
            {createSession.isPending ? "セッション作成中..." : "新しいセッションを作成"}
          </Button>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1.4fr)",
            gap: "16px",
            alignItems: "flex-start",
          }}
        >
          {/* 左カラム: セッション一覧 */}
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: "8px",
              border: "1px solid #DFE1E6",
              padding: "16px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "12px",
              }}
            >
              <h2
                style={{
                  fontSize: "16px",
                  fontWeight: 600,
                  margin: 0,
                  color: "#172B4D",
                }}
              >
                セッション一覧
              </h2>
              <Badge appearance="default">{sessions?.length ?? 0}件</Badge>
            </div>
            {isLoadingSessions ? (
              <div style={{ padding: "16px", textAlign: "center" }}>
                <Spinner size="medium" />
              </div>
            ) : sessions && sessions.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => setSessionId(session.id)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "12px",
                      borderRadius: "6px",
                      border:
                        sessionId === session.id
                          ? "2px solid #0052CC"
                          : "1px solid #DFE1E6",
                      backgroundColor:
                        sessionId === session.id ? "#DEEBFF" : "#FFFFFF",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "4px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "14px",
                          fontWeight: 500,
                          color: "#172B4D",
                        }}
                      >
                        {session.title || "無題のセッション"}
                      </span>
                      <Badge appearance="default">
                        {session._count?.messages ?? 0} メッセージ
                      </Badge>
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#6B778C",
                        marginBottom: "2px",
                      }}
                    >
                      作成: {new Date(session.createdAt).toLocaleString("ja-JP")}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState
                header="セッションがありません"
                description="上のボタンから新しいセッションを作成してください。"
              />
            )}
          </div>

          {/* 右カラム: メッセージ & タスク */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* メッセージ送信 & 履歴 */}
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: "8px",
                border: "1px solid #DFE1E6",
                padding: "16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "12px",
                }}
              >
                <h2
                  style={{
                    fontSize: "16px",
                    fontWeight: 600,
                    margin: 0,
                    color: "#172B4D",
                  }}
                >
                  メッセージ
                </h2>
                <Badge appearance="subtle">
                  {sessionId ? "セッション選択中" : "セッション未選択"}
                </Badge>
              </div>

              {sessionId ? (
                <>
                  <div style={{ marginBottom: "12px" }}>
                    <TextField
                      value={message}
                      onChange={(e) =>
                        setMessage((e.target as HTMLInputElement).value)
                      }
                      isDisabled={sendMessage.isPending}
                      placeholder="メッセージを入力して ⌘+Enter / Ctrl+Enter で送信"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault();
                          void handleSendMessage();
                        }
                      }}
                    />
                    <div
                      style={{
                        marginTop: "8px",
                        display: "flex",
                        gap: "8px",
                      }}
                    >
                      <Button
                        appearance="primary"
                        onClick={handleSendMessage}
                        isDisabled={sendMessage.isPending || !message.trim()}
                      >
                        {sendMessage.isPending ? "送信中..." : "送信"}
                      </Button>
                      <Button
                        appearance="subtle"
                        onClick={handleFlush}
                        isDisabled={flush.isPending}
                      >
                        {flush.isPending ? "タスク抽出中..." : "タスク抽出"}
                      </Button>
                    </div>
                  </div>

                  <div
                    style={{
                      maxHeight: "260px",
                      overflowY: "auto",
                      paddingRight: "4px",
                    }}
                  >
                    {isLoadingMessages ? (
                      <div style={{ textAlign: "center", padding: "16px" }}>
                        <Spinner size="small" />
                      </div>
                    ) : messages && messages.length > 0 ? (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        }}
                      >
                        {messages.map((msg) => (
                          <div
                            key={msg.id}
                            style={{
                              alignSelf:
                                msg.role === "user" ? "flex-end" : "flex-start",
                              maxWidth: "80%",
                              backgroundColor:
                                msg.role === "user" ? "#DEEBFF" : "#F4F5F7",
                              borderRadius: "8px",
                              padding: "8px 12px",
                            }}
                          >
                            <div
                              style={{
                                fontSize: "11px",
                                fontWeight: 500,
                                color: "#6B778C",
                                marginBottom: "2px",
                              }}
                            >
                              {msg.role === "user" ? "ユーザー" : "アシスタント"}
                            </div>
                            <div
                              style={{
                                fontSize: "13px",
                                color: "#172B4D",
                                whiteSpace: "pre-wrap",
                              }}
                            >
                              {msg.content}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontSize: "13px", color: "#6B778C" }}>
                        メッセージがありません。上のフォームからメッセージを送信してください。
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <EmptyState
                  header="セッションが選択されていません"
                  description="左側のリストからセッションを選択するか、新しいセッションを作成してください。"
                />
              )}
            </div>

            {/* タスク一覧 */}
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: "8px",
                border: "1px solid #DFE1E6",
                padding: "16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "12px",
                }}
              >
                <h2
                  style={{
                    fontSize: "16px",
                    fontWeight: 600,
                    margin: 0,
                    color: "#172B4D",
                  }}
                >
                  抽出されたタスク
                </h2>
                <Badge appearance="default">
                  {tasks?.length ?? 0}件
                </Badge>
              </div>

              {sessionId ? (
                isLoadingTasks ? (
                  <div style={{ textAlign: "center", padding: "16px" }}>
                    <Spinner size="small" />
                  </div>
                ) : tasks && tasks.length > 0 ? (
                  <div
                    style={{
                      maxHeight: "220px",
                      overflowY: "auto",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        style={{
                          padding: "10px 12px",
                          borderRadius: "6px",
                          border: "1px solid #DFE1E6",
                          backgroundColor: "#FFFFFF",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: "4px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "14px",
                              fontWeight: 500,
                              color: "#172B4D",
                            }}
                          >
                            {task.description}
                          </span>
                          <span
                            style={{
                              fontSize: "11px",
                              color: "#6B778C",
                            }}
                          >
                            #{task.order}
                          </span>
                        </div>
                        <div style={{ marginBottom: "4px" }}>
                          <Badge
                            appearance={
                              task.status === "success"
                                ? "added"
                                : task.status === "failed"
                                ? "removed"
                                : "default"
                            }
                          >
                            {task.status}
                          </Badge>
                        </div>
                        {task.progresses &&
                          Array.isArray(task.progresses) &&
                          task.progresses.length > 0 && (
                            <div
                              style={{
                                marginTop: "4px",
                                fontSize: "12px",
                                color: "#6B778C",
                              }}
                            >
                              <div style={{ fontWeight: 500, marginBottom: "2px" }}>
                                進捗:
                              </div>
                              <ul style={{ paddingLeft: "18px", margin: 0 }}>
                                {task.progresses.map((progress, idx) => (
                                  <li key={idx}>{String(progress)}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: "13px", color: "#6B778C" }}>
                    タスクがありません。「タスク抽出」を実行すると、ここにタスクが表示されます。
                  </p>
                )
              ) : (
                <EmptyState
                  header="セッションが選択されていません"
                  description="左側のリストからセッションを選択してください。"
                />
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

