# Acontext統合実装例

このドキュメントは、beauty projectにAcontextを統合する具体的な実装例を示します。

## 1. セットアップ

### 1.1 依存関係の追加

```bash
cd "/Users/yutatomi/Desktop/beauty project"
npm install @acontext/acontext
```

### 1.2 環境変数の追加

`.env`ファイルに以下を追加:

```env
# Acontext設定
ACONTEXT_BASE_URL=http://localhost:8029/api/v1
ACONTEXT_API_KEY=sk-ac-your-root-api-bearer-token
```

### 1.3 Acontextサーバーの起動

```bash
# Acontext CLIのインストール（初回のみ）
curl -fsSL https://install.acontext.io | sh

# Docker ComposeでAcontextサーバーを起動
acontext docker up
```

## 2. クライアントサービスの作成

### 2.1 Acontextクライアントサービス

`src/server/services/acontext-client.ts`を作成:

```typescript
import { AcontextClient } from "@acontext/acontext";

let acontextClient: AcontextClient | null = null;

export function getAcontextClient(): AcontextClient {
  if (!acontextClient) {
    const baseUrl = process.env.ACONTEXT_BASE_URL || "http://localhost:8029/api/v1";
    const apiKey = process.env.ACONTEXT_API_KEY || "sk-ac-your-root-api-bearer-token";

    acontextClient = new AcontextClient({
      base_url: baseUrl,
      api_key: apiKey,
    });
  }
  return acontextClient;
}

/**
 * ユーザー専用のSpace IDを取得または作成
 */
export async function getUserSpaceId(userId: number): Promise<string | undefined> {
  try {
    const client = getAcontextClient();
    
    // 既存のSpaceを検索（実装は簡略化）
    // 実際には、Space IDをデータベースに保存する必要がある
    // ここでは、ユーザーIDをプロジェクトIDとして使用
    const space = await client.spaces.create({
      // Space名にユーザーIDを含める
      name: `beauty-clinic-user-${userId}`,
    });

    return space.id;
  } catch (error) {
    console.error("Failed to get or create user space:", error);
    return undefined;
  }
}
```

## 3. 戦略分析への統合例

### 3.1 戦略分析ルーターの修正

`src/server/api/routers/strategy.ts`を修正:

```typescript
import { getAcontextClient, getUserSpaceId } from "@/server/services/acontext-client";

export const strategyRouter = router({
  analyzeMarketPosition: publicProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        location: z.string().min(1, "場所を入力してください"),
        productIds: z.array(z.number().int().positive()).optional(),
        includeMarketData: z.boolean().optional().default(true),
        includeSNSData: z.boolean().optional().default(true),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        // Acontextセッションの作成
        const acontextClient = getAcontextClient();
        const spaceId = await getUserSpaceId(input.userId);
        
        const session = await acontextClient.sessions.create({
          space_id: spaceId,
        });

        // ユーザーのリクエストをセッションに保存
        await acontextClient.sessions.send_message(session.id, {
          role: "user",
          content: `市場分析を依頼します。場所: ${input.location}, 商品IDs: ${input.productIds?.join(", ") || "全商品"}`,
        });

        // 既存のロジック（変更なし）
        const provider = await getStrategyAIProvider(input.userId);
        let result;

        if (provider === "claude") {
          result = await claudeAnalyzeMarketPosition(
            input.userId,
            input.location,
            input.productIds,
            input.includeMarketData,
            input.includeSNSData,
          );
        } else if (provider === "gemini") {
          result = await geminiAnalyzeMarketPosition(
            input.userId,
            input.location,
            input.productIds,
            input.includeMarketData,
            input.includeSNSData,
          );
        } else {
          result = await chatgptAnalyzeMarketPosition(
            input.userId,
            input.location,
            input.productIds,
            input.includeMarketData,
            input.includeSNSData,
          );
        }

        // AI応答をセッションに保存
        await acontextClient.sessions.send_message(session.id, {
          role: "assistant",
          content: JSON.stringify(result, null, 2),
        });

        // タスクの状態を取得（オプション）
        // 注意: flush()はブロッキング呼び出しなので、本番環境では非同期で処理
        if (process.env.NODE_ENV === "development") {
          await acontextClient.sessions.flush(session.id);
          const tasks = await acontextClient.sessions.get_tasks(session.id);
          console.log("Extracted tasks:", tasks);
        }

        // 既存のレスポンスにセッションIDを追加
        return {
          ...result,
          sessionId: session.id,
        };
      } catch (error) {
        // エラーハンドリング
        console.error("Strategy analysis error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "戦略分析中にエラーが発生しました",
        });
      }
    }),

  // 他のエンドポイントも同様に統合可能
  // ...
});
```

## 4. コンテンツ生成への統合例

### 4.1 コンテンツ生成サービスの修正

`src/server/services/content-generation.ts`に追加:

```typescript
import { getAcontextClient, getUserSpaceId } from "./acontext-client";

/**
 * コンテンツ生成をAcontextセッションに記録
 */
async function recordContentGenerationToAcontext(
  userId: number,
  contentType: string,
  prompt: string,
  result: any,
): Promise<string | undefined> {
  try {
    const acontextClient = getAcontextClient();
    const spaceId = await getUserSpaceId(userId);

    if (!spaceId) {
      return undefined;
    }

    const session = await acontextClient.sessions.create({
      space_id: spaceId,
    });

    // コンテンツ生成リクエストを記録
    await acontextClient.sessions.send_message(session.id, {
      role: "user",
      content: `コンテンツ生成: ${contentType}\nプロンプト: ${prompt}`,
    });

    // 生成結果を記録
    await acontextClient.sessions.send_message(session.id, {
      role: "assistant",
      content: typeof result === "string" ? result : JSON.stringify(result, null, 2),
    });

    return session.id;
  } catch (error) {
    console.error("Failed to record content generation to Acontext:", error);
    return undefined;
  }
}

// 既存の関数を修正してAcontextに記録
export async function generateInstagramContent(
  userId: number,
  treatmentId: number,
  tone: string,
  snsResearchIds?: number[],
): Promise<InstagramContentJson> {
  // 既存のロジック
  const prompt = await buildInstagramPrompt(...);
  const result = await callChatGPT(...);

  // Acontextに記録
  await recordContentGenerationToAcontext(
    userId,
    "instagram_post_text",
    prompt,
    result,
  );

  return result;
}
```

## 5. スキル検索の活用例

### 5.1 過去のスキルを検索してプロンプトに組み込む

`src/server/services/strategy-with-skills.ts`を作成:

```typescript
import { getAcontextClient, getUserSpaceId } from "./acontext-client";
import { analyzeMarketPosition as claudeAnalyzeMarketPosition } from "./claude";

/**
 * 過去のスキルを活用した市場分析
 */
export async function analyzeMarketPositionWithSkills(
  userId: number,
  location: string,
  productIds?: number[],
): Promise<any> {
  const acontextClient = getAcontextClient();
  const spaceId = await getUserSpaceId(userId);

  if (!spaceId) {
    // Spaceがない場合は通常の分析を実行
    return await claudeAnalyzeMarketPosition(userId, location, productIds);
  }

  // 過去のスキルを検索
  const skills = await acontextClient.spaces.experience_search(
    spaceId,
    `市場分析 ${location}`,
    { mode: "fast" }, // または "agentic"
  );

  // スキルをプロンプトに組み込む
  let enhancedPrompt = `以下の過去の成功パターンを参考に、市場分析を実行してください。\n\n`;

  if (skills && skills.length > 0) {
    enhancedPrompt += "【過去の成功パターン】\n";
    for (const skill of skills.slice(0, 3)) { // 上位3つを使用
      enhancedPrompt += `- ${skill.use_when}\n`;
      if (skill.preferences) {
        enhancedPrompt += `  好み: ${skill.preferences}\n`;
      }
    }
    enhancedPrompt += "\n";
  }

  enhancedPrompt += `【現在のリクエスト】\n場所: ${location}\n商品IDs: ${productIds?.join(", ") || "全商品"}`;

  // 通常の分析を実行（プロンプトを拡張）
  return await claudeAnalyzeMarketPosition(
    userId,
    location,
    productIds,
    true,
    true,
    enhancedPrompt, // 拡張されたプロンプト
  );
}
```

## 6. タスク進捗の取得例

### 6.1 フロントエンドでのタスク表示

`src/features/strategy/strategy-analysis.tsx`に追加:

```typescript
import { trpc } from "@/trpc/react";
import { useState, useEffect } from "react";

export function StrategyAnalysis() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);

  const analyzeMutation = trpc.strategy.analyzeMarketPosition.useMutation({
    onSuccess: (data) => {
      if (data.sessionId) {
        setSessionId(data.sessionId);
        // タスクを取得
        fetchTasks(data.sessionId);
      }
    },
  });

  const fetchTasks = async (sessionId: string) => {
    try {
      // Acontext APIを直接呼び出す（またはtRPCエンドポイントを作成）
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_ACONTEXT_BASE_URL}/sessions/${sessionId}/tasks`,
        {
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_ACONTEXT_API_KEY}`,
          },
        },
      );
      const data = await response.json();
      setTasks(data.items || []);
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    }
  };

  useEffect(() => {
    if (sessionId) {
      // 定期的にタスクを更新
      const interval = setInterval(() => {
        fetchTasks(sessionId);
      }, 5000); // 5秒ごと

      return () => clearInterval(interval);
    }
  }, [sessionId]);

  return (
    <div>
      {/* 既存のUI */}
      
      {/* タスク進捗表示 */}
      {tasks.length > 0 && (
        <div>
          <h3>タスク進捗</h3>
          {tasks.map((task) => (
            <div key={task.id}>
              <p>{task.data.task_description}</p>
              <p>ステータス: {task.status}</p>
              {task.data.progresses && (
                <ul>
                  {task.data.progresses.map((progress: string, i: number) => (
                    <li key={i}>{progress}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## 7. tRPCエンドポイントの追加（オプション）

### 7.1 Acontext関連のtRPCルーター

`src/server/api/routers/acontext.ts`を作成:

```typescript
import { z } from "zod";
import { publicProcedure, router } from "../trpc";
import { getAcontextClient, getUserSpaceId } from "@/server/services/acontext-client";

export const acontextRouter = router({
  getSessionTasks: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const client = getAcontextClient();
      const tasks = await client.sessions.get_tasks(input.sessionId);
      return tasks;
    }),

  searchSkills: publicProcedure
    .input(
      z.object({
        userId: z.number(),
        query: z.string(),
        mode: z.enum(["fast", "agentic"]).optional().default("fast"),
      }),
    )
    .query(async ({ input }) => {
      const client = getAcontextClient();
      const spaceId = await getUserSpaceId(input.userId);
      
      if (!spaceId) {
        return { items: [] };
      }

      const skills = await client.spaces.experience_search(spaceId, input.query, {
        mode: input.mode,
      });
      return skills;
    }),

  getSessionMessages: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const client = getAcontextClient();
      const messages = await client.sessions.get_messages(input.sessionId);
      return messages;
    }),
});
```

`src/server/api/root.ts`に追加:

```typescript
import { acontextRouter } from "./routers/acontext";

export const appRouter = router({
  // ...既存のルーター
  acontext: acontextRouter,
});
```

## 8. エラーハンドリング

### 8.1 Acontext接続エラーの処理

```typescript
import { getAcontextClient } from "@/server/services/acontext-client";

async function safeAcontextOperation<T>(
  operation: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    // Acontextサーバーが起動しているか確認
    const client = getAcontextClient();
    await client.ping();
    return await operation();
  } catch (error) {
    console.warn("Acontext operation failed, using fallback:", error);
    return fallback;
  }
}

// 使用例
const session = await safeAcontextOperation(
  async () => {
    const client = getAcontextClient();
    return await client.sessions.create({ space_id: spaceId });
  },
  null, // フォールバック値
);
```

## 9. テスト

### 9.1 統合テストの例

`src/server/services/__tests__/acontext-client.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from "@jest/globals";
import { getAcontextClient } from "../acontext-client";

describe("Acontext Client", () => {
  beforeAll(async () => {
    // Acontextサーバーが起動していることを確認
    const client = getAcontextClient();
    await client.ping();
  });

  it("should create a session", async () => {
    const client = getAcontextClient();
    const session = await client.sessions.create();
    expect(session.id).toBeDefined();
  });

  it("should send and retrieve messages", async () => {
    const client = getAcontextClient();
    const session = await client.sessions.create();

    await client.sessions.send_message(session.id, {
      role: "user",
      content: "Test message",
    });

    const messages = await client.sessions.get_messages(session.id);
    expect(messages.items.length).toBeGreaterThan(0);
  });
});
```

## 10. デプロイ時の注意事項

### 10.1 環境変数の設定

Vercelなどのデプロイ環境では、環境変数を設定:

```
ACONTEXT_BASE_URL=https://your-acontext-server.com/api/v1
ACONTEXT_API_KEY=sk-ac-your-production-api-key
```

### 10.2 Acontextサーバーのデプロイ

Acontextサーバーを別途デプロイする必要があります:
- VPS（DigitalOcean、AWS EC2など）
- Docker Composeで起動
- または、Acontextのクラウドサービス（利用可能な場合）

---

**注意**: これらの実装例は概念実証（PoC）レベルのものです。本番環境では、エラーハンドリング、ログ記録、パフォーマンス最適化などを追加してください。


