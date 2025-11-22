/**
 * 動画生成サービス（要件定義書3.3, 3.4に基づく）
 * Pika Labs API統合（短尺動画）- fal-ai経由
 * Synthesia API統合（施術説明動画）
 */

import { fal } from "@fal-ai/client";
import { retryWithBackoff, formatVideoGenerationError, type RetryOptions } from "./utils/video-retry";

// 短尺動画生成オプション
export interface ShortVideoGenerationOptions {
  videoType: "reels" | "tiktok" | "youtube_shorts";
  prompt: string;
  duration: 5 | 10 | 15; // 秒（Pika 2.2は5または10のみ）
  aspectRatio: "9:16" | "16:9" | "1:1" | "4:5" | "5:4" | "3:2" | "2:3";
  bgmEnabled?: boolean;
  textOverlay?: string[];
  videoStyle?: "realistic" | "animation" | "slideshow";
  negativePrompt?: string;
  seed?: number;
  resolution?: "720p" | "1080p";
}

// 施術説明動画生成オプション
export interface ExplanationVideoGenerationOptions {
  videoType: "treatment_explanation" | "pre_care" | "post_care" | "faq";
  treatmentName: string;
  script: string;
  duration?: 60 | 120 | 180; // 秒
  avatarId?: string;
  language?: "ja" | "en" | "zh" | "ko";
  background?: "clinic" | "simple";
}

// 生成された動画
export interface GeneratedVideo {
  id?: number;
  url: string;
  duration: number;
  videoType: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
}

/**
 * プロンプトを医療広告ガイドラインに準拠させる
 */
function sanitizePromptForMedicalGuidelines(prompt: string): string {
  // 既存のadvertising-guidelinesを活用
  const { cleanTextForAdvertising } = require("@/server/utils/advertising-guidelines");
  const { cleanedText } = cleanTextForAdvertising(prompt);
  return cleanedText;
}

/**
 * Pika Labs APIを使用して短尺動画を生成
 * fal-ai経由でPika 2.2モデルにアクセス
 * 参考: https://fal.ai/models/fal-ai/pika/v2.2
 */
export async function generateShortVideoWithPika(
  options: ShortVideoGenerationOptions,
  contentText?: string
): Promise<GeneratedVideo> {
  // FAL_KEYまたはPIKA_LABS_API_KEYを使用（後方互換性のため）
  const apiKey = process.env.FAL_KEY || process.env.PIKA_LABS_API_KEY;
  
  if (!apiKey) {
    throw new Error("Pika Labs API key is not configured. Please set FAL_KEY or PIKA_LABS_API_KEY environment variable.");
  }

  // fal-aiクライアントの設定
  fal.config({
    credentials: apiKey,
  });

  // プロンプトを医療広告ガイドラインに準拠させる
  const sanitizedPrompt = sanitizePromptForMedicalGuidelines(
    contentText ? `${options.prompt}. Context: ${contentText}` : options.prompt
  );

  // アスペクト比をPika 2.2形式に変換
  const aspectRatioMap: Record<string, "16:9" | "9:16" | "1:1" | "4:5" | "5:4" | "3:2" | "2:3"> = {
    "9:16": "9:16",
    "16:9": "16:9",
    "1:1": "1:1",
    "4:5": "4:5",
    "5:4": "5:4",
    "3:2": "3:2",
    "2:3": "2:3",
  };
  const pikaAspectRatio = aspectRatioMap[options.aspectRatio] || "9:16";

  // 動画の長さをPika 2.2のサポート範囲に制限（5または10秒のみ）
  const pikaDuration = options.duration === 15 ? 10 : (options.duration === 5 || options.duration === 10 ? options.duration : 5) as 5 | 10;

  // 解像度
  const resolution = options.resolution || "720p";

  // リトライオプション
  const retryOptions: RetryOptions = {
    maxRetries: 3,
    retryDelay: 1000,
    exponentialBackoff: true,
  };

  // リトライロジックを使用して動画生成を実行
  const retryResult = await retryWithBackoff(async () => {
    console.log(`[Video Generation] Pika Labs (fal-ai) API call:`, {
      model: "fal-ai/pika/v2.2/text-to-video",
      videoType: options.videoType,
      duration: pikaDuration,
      aspectRatio: pikaAspectRatio,
      resolution,
    });

    // fal-ai経由でPika 2.2を呼び出し
    const result = await fal.subscribe("fal-ai/pika/v2.2/text-to-video", {
      input: {
        prompt: sanitizedPrompt,
        aspect_ratio: pikaAspectRatio,
        resolution: resolution as "720p" | "1080p",
        duration: pikaDuration,
        negative_prompt: options.negativePrompt || "ugly, bad, terrible",
        ...(options.seed && { seed: options.seed }),
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS" && update.logs) {
          update.logs.map((log) => log.message).forEach((message) => {
            console.log(`[Video Generation] Pika Labs log: ${message}`);
          });
        }
      },
    });

    // レスポンス形式: { video: { url, file_name, content_type, file_size } }
    const videoUrl = result.data?.video?.url;
    const videoFileName = result.data?.video?.file_name;
    const videoFileSize = result.data?.video?.file_size;
    const requestId = result.requestId;

    if (!videoUrl) {
      throw new Error("Pika Labs API did not return a video URL");
    }

    console.log(`[Video Generation] Pika Labs success:`, { 
      requestId, 
      videoUrl, 
      fileName: videoFileName,
      fileSize: videoFileSize 
    });

    // 解像度に基づいて幅と高さを計算
    let width = 1080;
    let height = 1080;
    if (pikaAspectRatio === "9:16") {
      width = resolution === "1080p" ? 1080 : 720;
      height = resolution === "1080p" ? 1920 : 1280;
    } else if (pikaAspectRatio === "16:9") {
      width = resolution === "1080p" ? 1920 : 1280;
      height = resolution === "1080p" ? 1080 : 720;
    } else if (pikaAspectRatio === "1:1") {
      width = height = resolution === "1080p" ? 1080 : 720;
    } else if (pikaAspectRatio === "4:5") {
      width = resolution === "1080p" ? 1080 : 720;
      height = resolution === "1080p" ? 1350 : 900;
    } else if (pikaAspectRatio === "5:4") {
      width = resolution === "1080p" ? 1350 : 900;
      height = resolution === "1080p" ? 1080 : 720;
    } else if (pikaAspectRatio === "3:2") {
      width = resolution === "1080p" ? 1620 : 1080;
      height = resolution === "1080p" ? 1080 : 720;
    } else if (pikaAspectRatio === "2:3") {
      width = resolution === "1080p" ? 1080 : 720;
      height = resolution === "1080p" ? 1620 : 1080;
    }

    return {
      id: requestId ? parseInt(String(requestId).replace(/-/g, '').substring(0, 10), 16) : undefined,
      url: videoUrl,
      duration: pikaDuration,
      videoType: options.videoType,
      thumbnailUrl: undefined, // Pika 2.2はサムネイルを返さない
      width,
      height,
    };
  }, retryOptions);

  if (!retryResult.success || !retryResult.data) {
    const errorMessage = formatVideoGenerationError(retryResult.error);
    throw new Error(`短尺動画の生成に失敗しました（${retryResult.attempts}回試行）: ${errorMessage}`);
  }

  return retryResult.data;
}

/**
 * Synthesia APIを使用して施術説明動画を生成
 * 参考: https://docs.synthesia.io/
 * API v2を使用: https://docs.synthesia.io/reference/introduction
 */
export async function generateExplanationVideoWithSynthesia(
  options: ExplanationVideoGenerationOptions
): Promise<GeneratedVideo> {
  const apiKey = process.env.SYNTHESIA_API_KEY;
  
  if (!apiKey) {
    throw new Error("Synthesia API key is not configured. Please set SYNTHESIA_API_KEY environment variable.");
  }

  // スクリプトを医療広告ガイドラインに準拠させる
  const sanitizedScript = sanitizePromptForMedicalGuidelines(options.script);

  // 言語コードをSynthesia形式に変換
  const languageMap: Record<string, string> = {
    "ja": "ja-JP",
    "en": "en-US",
    "zh": "zh-CN",
    "ko": "ko-KR",
  };
  const synthesiaLanguage = languageMap[options.language || "ja"] || "ja-JP";

  // アバターIDのデフォルト値
  const avatarId = options.avatarId || process.env.SYNTHESIA_DEFAULT_AVATAR_ID || "anna_costume1_cameraA_presenting";

  // リトライオプション
  const retryOptions: RetryOptions = {
    maxRetries: 3,
    retryDelay: 2000, // Synthesiaは処理に時間がかかるため、少し長めの待機時間
    exponentialBackoff: true,
  };

  // リトライロジックを使用して動画生成を実行
  const retryResult = await retryWithBackoff(async () => {
    // Synthesia API v2呼び出し
    // 参考: https://docs.synthesia.io/reference/create-video
    const apiBaseUrl = process.env.SYNTHESIA_API_URL || "https://api.synthesia.io";
    const endpoint = `${apiBaseUrl}/v2/videos`;

    // Synthesia API v2のリクエスト形式
    // スクリプトは複数のシーンで構成可能
    const requestBody = {
      title: `${options.treatmentName} - ${options.videoType}`,
      description: `施術説明動画: ${options.treatmentName}`,
      visibility: "public", // または "private", "unlisted"
      scenes: [
        {
          type: "avatar",
          avatar: avatarId,
          voice: {
            provider: "microsoft",
            voiceId: synthesiaLanguage === "ja-JP" ? "ja-JP-NanamiNeural" : 
                     synthesiaLanguage === "en-US" ? "en-US-AriaNeural" :
                     synthesiaLanguage === "zh-CN" ? "zh-CN-XiaoxiaoNeural" :
                     "ko-KR-SunHiNeural",
          },
          script: {
            type: "text",
            input: sanitizedScript,
          },
          background: options.background === "clinic" ? "clinic_interior" : "solid_color",
        },
      ],
      ...(options.duration && { duration: options.duration }),
    };

    console.log(`[Video Generation] Synthesia API call:`, {
      endpoint,
      videoType: options.videoType,
      treatmentName: options.treatmentName,
      language: synthesiaLanguage,
    });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Synthesia API error (${response.status}): ${errorText}`;
      
      // よくあるエラーの詳細を追加
      if (response.status === 401) {
        errorMessage = "Synthesia API認証エラー: APIキーが無効です";
      } else if (response.status === 429) {
        errorMessage = "Synthesia APIレート制限: しばらく待ってから再試行してください";
      } else if (response.status === 400) {
        errorMessage = `Synthesia APIリクエストエラー: ${errorText}`;
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    // Synthesia API v2のレスポンス形式
    // { id, status, download_url, thumbnail_url, etc. }
    const videoId = data.id || data.video_id;
    const videoUrl = data.download_url || data.video_url || data.url;
    const thumbnailUrl = data.thumbnail_url || data.thumbnail;
    const status = data.status || "processing";

    if (!videoId) {
      throw new Error("Synthesia API did not return a video ID");
    }

    console.log(`[Video Generation] Synthesia success:`, { videoId, status });

    // 注意: Synthesiaは非同期で動画を生成するため、即座にURLが返らない場合がある
    // statusが"processing"の場合は、ポーリングが必要
    if (status === "processing" && !videoUrl) {
      // ポーリング用のvideoIdを返す
      // 実際の実装では、別途ポーリングエンドポイントを呼び出す必要がある
      return {
        id: parseInt(String(videoId)),
        url: `https://app.synthesia.io/videos/${videoId}`, // 暫定的なURL
        duration: options.duration || 120,
        videoType: options.videoType,
        thumbnailUrl,
      };
    }

    return {
      id: parseInt(String(videoId)),
      url: videoUrl || `https://app.synthesia.io/videos/${videoId}`,
      duration: options.duration || 120,
      videoType: options.videoType,
      thumbnailUrl,
    };
  }, retryOptions);

  if (!retryResult.success || !retryResult.data) {
    const errorMessage = formatVideoGenerationError(retryResult.error);
    throw new Error(`説明動画の生成に失敗しました（${retryResult.attempts}回試行）: ${errorMessage}`);
  }

  return retryResult.data;
}

/**
 * Synthesia動画のステータスをポーリングして取得
 * 動画生成は非同期のため、完了までポーリングが必要
 */
export async function pollSynthesiaVideoStatus(
  videoId: string,
  maxAttempts: number = 30,
  intervalMs: number = 10000
): Promise<GeneratedVideo> {
  const apiKey = process.env.SYNTHESIA_API_KEY;
  
  if (!apiKey) {
    throw new Error("Synthesia API key is not configured.");
  }

  const apiBaseUrl = process.env.SYNTHESIA_API_URL || "https://api.synthesia.io";
  const endpoint = `${apiBaseUrl}/v2/videos/${videoId}`;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Synthesia API error (${response.status})`);
      }

      const data = await response.json();
      const status = data.status || data.video?.status;

      console.log(`[Video Generation] Synthesia polling (attempt ${attempt}/${maxAttempts}): status=${status}`);

      if (status === "complete" || status === "ready") {
        const videoUrl = data.download_url || data.video_url || data.video?.url;
        const thumbnailUrl = data.thumbnail_url || data.thumbnail || data.video?.thumbnail;

        return {
          id: parseInt(String(videoId)),
          url: videoUrl || `https://app.synthesia.io/videos/${videoId}`,
          duration: data.duration || 120,
          videoType: data.title || "explanation",
          thumbnailUrl,
        };
      }

      if (status === "failed" || status === "error") {
        throw new Error(`Synthesia video generation failed: ${data.error || "Unknown error"}`);
      }

      // まだ処理中の場合は待機
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error instanceof Error ? error : new Error(String(error));
      }
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }

  throw new Error(`Synthesia video generation timeout after ${maxAttempts} attempts`);
}

/**
 * 動画生成（プロバイダー自動選択）
 */
export async function generateVideo(
  options: ShortVideoGenerationOptions | ExplanationVideoGenerationOptions,
  provider: "pika" | "synthesia" = "pika",
  contentText?: string
): Promise<GeneratedVideo> {
  switch (provider) {
    case "pika":
      return generateShortVideoWithPika(options as ShortVideoGenerationOptions, contentText);
    case "synthesia":
      return generateExplanationVideoWithSynthesia(options as ExplanationVideoGenerationOptions);
    default:
      throw new Error(`Unsupported video generation provider: ${provider}`);
  }
}

