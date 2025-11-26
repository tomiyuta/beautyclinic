/**
 * Acontext LLMプロンプト定義
 * タスク抽出、スキル学習、スキル検索に使用
 */

export const AI_CONTEXT_PROMPTS = {
  /**
   * タスク抽出プロンプト
   * 会話からタスクを抽出し、JSON形式で返す
   */
  TASK_EXTRACTION: `あなたはタスク抽出エージェントです。以下の会話を分析し、ユーザーが達成しようとしているタスクを識別してください。

【分析観点】
1. 明示的な依頼（「〜してください」「〜したい」）
2. 暗黙的な意図（質問や相談から推測される目的）
3. サブタスクへの分解（大きなタスクは分割）
4. 進捗状況の追跡（完了/進行中/未着手）
5. ユーザーの好みや制約条件

【状態判定基準】
- pending: まだ着手されていない
- running: 現在進行中（明確な完了報告なし）
- success: 完了し、ユーザーが満足している（明示的・暗黙的な承認あり）
- failed: 失敗、エラー発生、またはユーザーが不満を表明

【出力形式】
以下のJSON配列のみを出力してください。説明文は不要です。

[
  {
    "order": 1,
    "description": "タスクの具体的な説明",
    "status": "pending|running|success|failed",
    "progresses": ["進捗や変更点の履歴"],
    "userPreferences": ["ユーザーの好みや制約"]
  }
]

【会話】
{{conversation}}`,

  /**
   * スキル学習プロンプト
   * 完了したタスクから再利用可能なスキル（SOP）を抽出
   */
  SKILL_LEARNING: `あなたはスキル学習エージェントです。以下の完了したタスクから、再利用可能な標準手順（SOP）を抽出してください。

【分析観点】
1. タスクの目的と成果
2. 実行されたステップ（時系列順）
3. 使用されたツールやリソース
4. 成功要因やベストプラクティス
5. 複雑性の判定（simple/medium/complex）

【複雑性判定基準】
- simple: 3ステップ以下、単一ツール使用、5分以内で完了可能
- medium: 4-7ステップ、複数ツール使用、5-30分で完了可能
- complex: 8ステップ以上、複雑な条件分岐、30分以上で完了

【出力形式】
以下のJSON形式のみを出力してください。説明文は不要です。

{
  "name": "スキルの名前（簡潔に）",
  "description": "スキルの説明（何をするものか）",
  "steps": [
    {
      "order": 1,
      "action": "実行するアクション",
      "tool": "使用するツール（オプション）",
      "description": "ステップの詳細説明"
    }
  ],
  "complexity": "simple|medium|complex",
  "tags": ["関連するタグ1", "タグ2"]
}

【完了したタスク】
{{completedTasks}}`,

  /**
   * スキル検索（agenticモード）プロンプト
   * ユーザーの意図から関連するスキルを探索
   */
  SKILL_SEARCH_AGENTIC: `あなたはスキル検索エージェントです。ユーザーの意図から、関連するスキルを探索してください。

【分析観点】
1. ユーザーの意図や目標
2. 必要なステップやツール
3. 類似する既存スキルとの関連性
4. キーワードやタグの抽出

【出力形式】
以下のJSON形式のみを出力してください。説明文は不要です。

{
  "keywords": ["関連キーワード1", "キーワード2"],
  "suggestedTags": ["タグ1", "タグ2"],
  "searchQuery": "検索クエリ（FULLTEXT検索用）"
}

【ユーザーの意図】
{{userIntent}}

【既存スキルの例】
{{existingSkills}}`,
} as const;

/**
 * プロンプトの変数を置換
 */
export function replacePromptVariables(
  prompt: string,
  variables: Record<string, string>
): string {
  let result = prompt;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return result;
}


