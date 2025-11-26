export interface AiContextSettings {
  // タスク抽出
  taskExtraction: {
    model: string;
    timeoutMs: number;
  };
  // スキル学習
  skillLearning: {
    enabled: boolean;
    model: string;
    timeoutMs: number;
  };
  // flush
  flush: {
    defaultTimeoutMs: number;
    defaultJobType: "task_extraction" | "full_processing";
  };
  // ストレージ
  storage: {
    type: "database" | "s3";
    dbThreshold: number; // bytes
  };
}

export const defaultSettings: AiContextSettings = {
  taskExtraction: {
    model: "gpt-4o-mini",
    timeoutMs: 30000,
  },
  skillLearning: {
    enabled: true,
    model: "gpt-4o-mini",
    timeoutMs: 30000,
  },
  flush: {
    defaultTimeoutMs: 50000,
    defaultJobType: "task_extraction",
  },
  storage: {
    type: "database",
    dbThreshold: 1048576, // 1MB
  },
};

