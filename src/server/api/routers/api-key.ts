import { z } from "zod";
import { publicProcedure, router } from "@/server/api/trpc";
import { writeFile, readFile } from "fs/promises";
import { join } from "path";

const apiKeyInput = z.object({
  geminiApiKey: z.string().optional(),
  grokApiKey: z.string().optional(),
  claudeApiKey: z.string().optional(),
  openaiApiKey: z.string().optional(),
});

export const apiKeyRouter = router({
  // APIキーを設定
  setApiKeys: publicProcedure.input(apiKeyInput).mutation(async ({ input }) => {
    try {
      const envPath = join(process.cwd(), ".env");
      let envContent = "";

      // 既存の.envファイルを読み込む
      try {
        envContent = await readFile(envPath, "utf-8");
      } catch {
        // .envファイルが存在しない場合は新規作成
        envContent = "";
      }

      // 既存の環境変数を保持しつつ、新しい値を更新
      const envLines = envContent.split("\n");
      const envMap = new Map<string, string>();

      // 既存の行をパース
      for (const line of envLines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          const match = trimmed.match(/^([^=]+)=(.*)$/);
          if (match) {
            const key = match[1]?.trim();
            const value = match[2]?.trim().replace(/^["']|["']$/g, "");
            if (key) {
              envMap.set(key, value || "");
            }
          }
        }
      }

      // 新しいAPIキーを設定
      if (input.geminiApiKey !== undefined) {
        envMap.set("GEMINI_API_KEY", input.geminiApiKey);
      }
      if (input.grokApiKey !== undefined) {
        envMap.set("GROK_API_KEY", input.grokApiKey);
      }
      if (input.claudeApiKey !== undefined) {
        envMap.set("CLAUDE_API_KEY", input.claudeApiKey);
      }
      if (input.openaiApiKey !== undefined) {
        envMap.set("OPENAI_API_KEY", input.openaiApiKey);
      }

      // DATABASE_URLは保持（既に存在する場合）
      if (!envMap.has("DATABASE_URL")) {
        const existingDbUrl = envContent.match(/DATABASE_URL="([^"]+)"/);
        if (existingDbUrl) {
          envMap.set("DATABASE_URL", existingDbUrl[1] || "");
        }
      }

      // .envファイルを再構築
      let newEnvContent = "# Environment variables\n";
      newEnvContent += "# API Keys\n";
      if (envMap.has("GEMINI_API_KEY")) {
        newEnvContent += `GEMINI_API_KEY="${envMap.get("GEMINI_API_KEY")}"\n`;
      }
      if (envMap.has("GROK_API_KEY")) {
        newEnvContent += `GROK_API_KEY="${envMap.get("GROK_API_KEY")}"\n`;
      }
      if (envMap.has("CLAUDE_API_KEY")) {
        newEnvContent += `CLAUDE_API_KEY="${envMap.get("CLAUDE_API_KEY")}"\n`;
      }
      if (envMap.has("OPENAI_API_KEY")) {
        newEnvContent += `OPENAI_API_KEY="${envMap.get("OPENAI_API_KEY")}"\n`;
      }
      newEnvContent += "\n";
      
      // DATABASE_URLとその他の環境変数を追加
      if (envMap.has("DATABASE_URL")) {
        newEnvContent += `DATABASE_URL="${envMap.get("DATABASE_URL")}"\n`;
      }
      
      // その他の環境変数（TURBOPACKなど）
      for (const [key, value] of envMap.entries()) {
        if (
          !["GEMINI_API_KEY", "GROK_API_KEY", "CLAUDE_API_KEY", "OPENAI_API_KEY", "DATABASE_URL"].includes(key)
        ) {
          newEnvContent += `${key}="${value}"\n`;
        }
      }

      await writeFile(envPath, newEnvContent, "utf-8");

      return {
        success: true,
        message: "APIキーを設定しました。サーバーを再起動してください。",
      };
    } catch (error) {
      console.error("Failed to set API keys:", error);
      throw new Error("APIキーの設定に失敗しました");
    }
  }),

  // APIキーの状態を取得（マスク表示）
  getApiKeyStatus: publicProcedure.query(async () => {
    try {
      const envPath = join(process.cwd(), ".env");
      let envContent = "";

      try {
        envContent = await readFile(envPath, "utf-8");
      } catch {
        return {
          gemini: false,
          grok: false,
          claude: false,
          openai: false,
        };
      }

      const geminiSet = /GEMINI_API_KEY=["']([^"']+)["']/.test(envContent);
      const grokSet = /GROK_API_KEY=["']([^"']+)["']/.test(envContent);
      const claudeSet = /CLAUDE_API_KEY=["']([^"']+)["']/.test(envContent);
      const openaiSet = /OPENAI_API_KEY=["']([^"']+)["']/.test(envContent);

      return {
        gemini: geminiSet,
        grok: grokSet,
        claude: claudeSet,
        openai: openaiSet,
      };
    } catch (error) {
      console.error("Failed to read API key status:", error);
      return {
        gemini: false,
        grok: false,
        claude: false,
        openai: false,
      };
    }
  }),
});

