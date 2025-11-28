import { saveAs } from 'file-saver';
import type { AIProvider } from '@/types/strategy';
import type { CouncilResult } from '@/types/ai-council';

// ダウンロード用のデータ型定義
export interface AnalysisResultData {
  // 単一AI分析結果
  singleResult?: {
    content: string;
    aiProvider: AIProvider;
    durationMs: number;
  };
  // Council分析結果
  councilResult?: CouncilResult;
  // メタデータ
  metadata: {
    analysisId: string;
    analysisType: string;
    analysisMode: 'single' | 'council';
    userId: number;
    createdAt: Date;
    location?: string;
  };
  // 入力データ（オプション）
  inputData?: {
    productIds?: number[];
    marketDataSelection?: {
      trendIds?: number[];
      priceIds?: number[];
      competitorIds?: number[];
    };
  };
}

// ダウンロードオプション
export interface DownloadOptions {
  format: 'pdf' | 'json';
  includeMetadata: boolean;
  includeInputData: boolean;
  customFileName?: string;
}

// AI名のラベル変換
export const AI_PROVIDER_LABELS: Record<AIProvider, string> = {
  claude: 'Claude',
  chatgpt: 'ChatGPT',
  gemini: 'Gemini',
  grok: 'Grok',
};

// 分析タイプのラベル変換
export const ANALYSIS_TYPE_LABELS: Record<string, string> = {
  comprehensive: '総合分析',
  pricing: '価格設定提案',
  campaign: 'キャンペーン案',
  'new-treatment': '新施術導入提案',
};

/**
 * ファイル名を生成する
 */
export function generateFileName(
  data: AnalysisResultData,
  format: 'pdf' | 'json',
  customName?: string
): string {
  if (customName) {
    // カスタム名が指定されている場合
    const sanitized = customName.replace(/[^\w\-_\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '_');
    return `${sanitized}.${format}`;
  }

  // 自動生成
  const analysisType = ANALYSIS_TYPE_LABELS[data.metadata.analysisType] || data.metadata.analysisType;
  const aiName = data.metadata.analysisMode === 'council' 
    ? 'Council' 
    : AI_PROVIDER_LABELS[data.singleResult?.aiProvider || 'claude'];
  const date = data.metadata.createdAt.toISOString().split('T')[0];
  
  return `戦略分析_${analysisType}_${aiName}_${date}.${format}`;
}

/**
 * 日時をフォーマットする
 */
export function formatDateTime(date: Date): string {
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tokyo'
  });
}

/**
 * 処理時間をフォーマットする
 */
export function formatDuration(durationMs: number): string {
  if (durationMs < 1000) {
    return `${durationMs}ms`;
  } else if (durationMs < 60000) {
    return `${(durationMs / 1000).toFixed(1)}秒`;
  } else {
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    return `${minutes}分${seconds}秒`;
  }
}

/**
 * JSON形式でダウンロードする
 */
export function downloadAsJSON(data: AnalysisResultData, options: DownloadOptions): void {
  try {
    // JSON構造を構築
    const jsonData: any = {
      metadata: {
        analysisId: data.metadata.analysisId,
        analysisType: data.metadata.analysisType,
        analysisMode: data.metadata.analysisMode,
        userId: data.metadata.userId,
        createdAt: data.metadata.createdAt.toISOString(),
        location: data.metadata.location,
        version: '1.0',
        exportedAt: new Date().toISOString(),
      }
    };

    // 入力データを含める場合
    if (options.includeInputData && data.inputData) {
      jsonData.input = data.inputData;
    }

    // 分析結果を追加
    if (data.singleResult) {
      jsonData.result = {
        content: data.singleResult.content,
        aiProvider: data.singleResult.aiProvider,
        durationMs: data.singleResult.durationMs,
      };
    }

    if (data.councilResult) {
      jsonData.councilResult = {
        stage1: data.councilResult.stage1,
        stage2: data.councilResult.stage2,
        stage3: data.councilResult.stage3,
        totalDurationMs: data.councilResult.totalDurationMs,
      };
    }

    // JSONファイルとして保存
    const jsonString = JSON.stringify(jsonData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const fileName = generateFileName(data, 'json', options.customFileName);
    
    saveAs(blob, fileName);
    
    console.log(`[Download] JSON exported: ${fileName}, size: ${blob.size} bytes`);
  } catch (error) {
    console.error('[Download] JSON export failed:', error);
    throw new Error('JSON形式でのダウンロードに失敗しました');
  }
}

/**
 * Markdownテキストを平文に変換する（PDF用）
 */
export function markdownToPlainText(markdown: string): string {
  return markdown
    // 見出し
    .replace(/^#{1,6}\s+(.+)$/gm, '$1')
    // 太字・斜体
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    // リンク
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    // コードブロック
    .replace(/```[\s\S]*?```/g, '[コードブロック]')
    .replace(/`(.+?)`/g, '$1')
    // リスト
    .replace(/^[\s]*[-*+]\s+(.+)$/gm, '• $1')
    .replace(/^[\s]*\d+\.\s+(.+)$/gm, '$1')
    // 改行の正規化
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * エラーハンドリング付きのダウンロード実行
 */
export async function executeDownload(
  downloadFn: () => Promise<void> | void,
  format: string
): Promise<void> {
  try {
    await downloadFn();
  } catch (error) {
    console.error(`[Download] ${format} download failed:`, error);
    
    // ユーザーフレンドリーなエラーメッセージ
    let message = `${format}形式でのダウンロードに失敗しました。`;
    
    if (error instanceof Error) {
      if (error.message.includes('memory') || error.message.includes('size')) {
        message += '\nファイルサイズが大きすぎる可能性があります。';
      } else if (error.message.includes('permission') || error.message.includes('access')) {
        message += '\nファイルの保存権限がない可能性があります。';
      }
    }
    
    throw new Error(message);
  }
}

/**
 * プログレス表示用のユーティリティ
 */
export class DownloadProgress {
  private onProgress?: (progress: number, message: string) => void;
  
  constructor(onProgress?: (progress: number, message: string) => void) {
    this.onProgress = onProgress;
  }
  
  update(progress: number, message: string): void {
    if (this.onProgress) {
      this.onProgress(Math.min(100, Math.max(0, progress)), message);
    }
  }
  
  complete(): void {
    this.update(100, 'ダウンロード完了');
  }
  
  error(message: string): void {
    if (this.onProgress) {
      this.onProgress(-1, `エラー: ${message}`);
    }
  }
}
