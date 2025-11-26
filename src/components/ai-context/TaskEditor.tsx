"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import Button from "@atlaskit/button";
import TextField from "@atlaskit/textfield";
import Badge from "@atlaskit/badge";
import Select from "@atlaskit/select";
import Modal, {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTransition,
} from "@atlaskit/modal-dialog";

interface Task {
  id: string;
  order: number;
  description: string;
  status: "pending" | "running" | "success" | "failed";
  progresses: string[] | null;
  userPreferences: string[] | null;
}

interface TaskEditorProps {
  task: Task;
  onClose: () => void;
  onUpdate: () => void;
}

const statusOptions = [
  { label: "⏳ Pending", value: "pending" },
  { label: "🔄 Running", value: "running" },
  { label: "✅ Success", value: "success" },
  { label: "❌ Failed", value: "failed" },
];

export default function TaskEditor({ task, onClose, onUpdate }: TaskEditorProps) {
  const [status, setStatus] = useState(task.status);
  const [progresses, setProgresses] = useState<string[]>(task.progresses ?? []);
  const [userPreferences, setUserPreferences] = useState<string[]>(task.userPreferences ?? []);
  const [newProgress, setNewProgress] = useState("");
  const [newPreference, setNewPreference] = useState("");

  const updateMutation = api.aiSession.updateTask.useMutation({
    onSuccess: () => {
      onUpdate();
      onClose();
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      taskId: task.id,
      status,
      progresses,
      userPreferences,
    });
  };

  const handleAddProgress = () => {
    if (newProgress.trim()) {
      setProgresses([...progresses, newProgress.trim()]);
      setNewProgress("");
    }
  };

  const handleRemoveProgress = (index: number) => {
    setProgresses(progresses.filter((_, i) => i !== index));
  };

  const handleAddPreference = () => {
    if (newPreference.trim()) {
      setUserPreferences([...userPreferences, newPreference.trim()]);
      setNewPreference("");
    }
  };

  const handleRemovePreference = (index: number) => {
    setUserPreferences(userPreferences.filter((_, i) => i !== index));
  };

  return (
    <ModalTransition>
      <Modal onClose={onClose} width="large">
        <ModalHeader>
          <ModalTitle>タスク #{task.order} を編集</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* タスク説明（読み取り専用） */}
            <div>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
                タスク内容
              </label>
              <p style={{
                borderRadius: "4px",
                background: "#F4F5F7",
                padding: "12px",
                color: "#172B4D",
                fontSize: "14px",
              }}>
                {task.description}
              </p>
            </div>

            {/* ステータス */}
            <div>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
                ステータス
              </label>
              <Select
                options={statusOptions}
                value={statusOptions.find((o) => o.value === status)}
                onChange={(opt) => {
                  const option = opt as { value: typeof status } | null;
                  if (option) setStatus(option.value);
                }}
              />
            </div>

            {/* 進捗 */}
            <div>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
                進捗メモ
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {progresses.map((p, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{
                      flex: 1,
                      borderRadius: "4px",
                      background: "#E3FCEF",
                      padding: "4px 12px",
                      fontSize: "14px",
                      color: "#172B4D",
                    }}>
                      {p}
                    </span>
                    <Button
                      appearance="subtle"
                      spacing="compact"
                      onClick={() => handleRemoveProgress(i)}
                    >
                      ✕
                    </Button>
                  </div>
                ))}
                <div style={{ display: "flex", gap: "8px" }}>
                  <TextField
                    value={newProgress}
                    onChange={(e) => setNewProgress((e.target as HTMLInputElement).value)}
                    placeholder="進捗を追加..."
                    onKeyDown={(e) => e.key === "Enter" && handleAddProgress()}
                  />
                  <Button appearance="subtle" onClick={handleAddProgress}>
                    追加
                  </Button>
                </div>
              </div>
            </div>

            {/* ユーザー嗜好 */}
            <div>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
                ユーザー嗜好
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {userPreferences.map((p, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{
                      flex: 1,
                      borderRadius: "4px",
                      background: "#F4F3FF",
                      padding: "4px 12px",
                      fontSize: "14px",
                      color: "#172B4D",
                    }}>
                      {p}
                    </span>
                    <Button
                      appearance="subtle"
                      spacing="compact"
                      onClick={() => handleRemovePreference(i)}
                    >
                      ✕
                    </Button>
                  </div>
                ))}
                <div style={{ display: "flex", gap: "8px" }}>
                  <TextField
                    value={newPreference}
                    onChange={(e) => setNewPreference((e.target as HTMLInputElement).value)}
                    placeholder="嗜好を追加..."
                    onKeyDown={(e) => e.key === "Enter" && handleAddPreference()}
                  />
                  <Button appearance="subtle" onClick={handleAddPreference}>
                    追加
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button appearance="subtle" onClick={onClose}>
            キャンセル
          </Button>
          <Button
            appearance="primary"
            onClick={handleSave}
            isDisabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? "保存中..." : "保存"}
          </Button>
        </ModalFooter>
      </Modal>
    </ModalTransition>
  );
}

