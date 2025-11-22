import { z } from "zod";
import { publicProcedure, router } from "@/server/api/trpc";
import { writeFile, readFile } from "fs/promises";
import { join } from "path";

const apiKeyInput = z.object({
  geminiApiKey: z.string().optional(),
  grokApiKey: z.string().optional(),
  claudeApiKey: z.string().optional(),
  openaiApiKey: z.string().optional(),
  serpApiKey: z.string().optional(),
  googleCustomSearchApiKey: z.string().optional(),
  googleCustomSearchEngineId: z.string().optional(),
  pikaLabsApiKey: z.string().optional(), // PIKA_LABS_API_KEY or FAL_KEY (fal-ai経由でPika Labsにアクセス)
  synthesiaApiKey: z.string().optional(),
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
      if (input.serpApiKey !== undefined) {
        envMap.set("SERP_API_KEY", input.serpApiKey);
      }
      if (input.googleCustomSearchApiKey !== undefined) {
        envMap.set("GOOGLE_CUSTOM_SEARCH_API_KEY", input.googleCustomSearchApiKey);
      }
      if (input.googleCustomSearchEngineId !== undefined) {
        envMap.set("GOOGLE_CUSTOM_SEARCH_ENGINE_ID", input.googleCustomSearchEngineId);
      }
      if (input.pikaLabsApiKey !== undefined) {
        // Pika Labsはfal-ai経由でアクセスするため、FAL_KEYとして設定
        // 後方互換性のためPIKA_LABS_API_KEYも設定
        envMap.set("FAL_KEY", input.pikaLabsApiKey);
        envMap.set("PIKA_LABS_API_KEY", input.pikaLabsApiKey);
      }
      if (input.synthesiaApiKey !== undefined) {
        envMap.set("SYNTHESIA_API_KEY", input.synthesiaApiKey);
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
      newEnvContent += "# AI API Keys\n";
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
      newEnvContent += "# Web Search API Keys (for latest information retrieval)\n";
      if (envMap.has("SERP_API_KEY")) {
        newEnvContent += `SERP_API_KEY="${envMap.get("SERP_API_KEY")}"\n`;
      }
      if (envMap.has("GOOGLE_CUSTOM_SEARCH_API_KEY")) {
        newEnvContent += `GOOGLE_CUSTOM_SEARCH_API_KEY="${envMap.get("GOOGLE_CUSTOM_SEARCH_API_KEY")}"\n`;
      }
      if (envMap.has("GOOGLE_CUSTOM_SEARCH_ENGINE_ID")) {
        newEnvContent += `GOOGLE_CUSTOM_SEARCH_ENGINE_ID="${envMap.get("GOOGLE_CUSTOM_SEARCH_ENGINE_ID")}"\n`;
      }
      newEnvContent += "\n";
      newEnvContent += "# Video Generation API Keys\n";
      if (envMap.has("FAL_KEY")) {
        newEnvContent += `FAL_KEY="${envMap.get("FAL_KEY")}"\n`;
      }
      if (envMap.has("PIKA_LABS_API_KEY")) {
        newEnvContent += `PIKA_LABS_API_KEY="${envMap.get("PIKA_LABS_API_KEY")}"\n`;
      }
      if (envMap.has("SYNTHESIA_API_KEY")) {
        newEnvContent += `SYNTHESIA_API_KEY="${envMap.get("SYNTHESIA_API_KEY")}"\n`;
      }
      newEnvContent += "\n";
      
      // DATABASE_URLとその他の環境変数を追加
      if (envMap.has("DATABASE_URL")) {
        newEnvContent += `DATABASE_URL="${envMap.get("DATABASE_URL")}"\n`;
      }
      
      // その他の環境変数（TURBOPACKなど）
      for (const [key, value] of envMap.entries()) {
        if (
          !["GEMINI_API_KEY", "GROK_API_KEY", "CLAUDE_API_KEY", "OPENAI_API_KEY", "DATABASE_URL", "SERP_API_KEY", "GOOGLE_CUSTOM_SEARCH_API_KEY", "GOOGLE_CUSTOM_SEARCH_ENGINE_ID", "FAL_KEY", "PIKA_LABS_API_KEY", "SYNTHESIA_API_KEY"].includes(key)
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
          serp: false,
          googleCustomSearch: false,
          pikaLabs: false,
          synthesia: false,
        };
      }

      const geminiSet = /GEMINI_API_KEY=["']([^"']+)["']/.test(envContent);
      const grokSet = /GROK_API_KEY=["']([^"']+)["']/.test(envContent);
      const claudeSet = /CLAUDE_API_KEY=["']([^"']+)["']/.test(envContent);
      const openaiSet = /OPENAI_API_KEY=["']([^"']+)["']/.test(envContent);
      const serpSet = /SERP_API_KEY=["']([^"']+)["']/.test(envContent);
      const googleCustomSearchSet = /GOOGLE_CUSTOM_SEARCH_API_KEY=["']([^"']+)["']/.test(envContent) && 
                                    /GOOGLE_CUSTOM_SEARCH_ENGINE_ID=["']([^"']+)["']/.test(envContent);
      const pikaLabsSet = /FAL_KEY=["']([^"']+)["']/.test(envContent) || /PIKA_LABS_API_KEY=["']([^"']+)["']/.test(envContent);
      const synthesiaSet = /SYNTHESIA_API_KEY=["']([^"']+)["']/.test(envContent);

      return {
        gemini: geminiSet,
        grok: grokSet,
        claude: claudeSet,
        openai: openaiSet,
        serp: serpSet,
        googleCustomSearch: googleCustomSearchSet,
        pikaLabs: pikaLabsSet,
        synthesia: synthesiaSet,
      };
    } catch (error) {
      console.error("Failed to read API key status:", error);
      return {
        gemini: false,
        grok: false,
        claude: false,
        openai: false,
        serp: false,
        googleCustomSearch: false,
      };
    }
  }),
});

