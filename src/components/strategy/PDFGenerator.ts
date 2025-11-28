import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import type { AnalysisResultData, DownloadOptions } from './DownloadUtils';
import { 
  generateFileName, 
  formatDateTime, 
  formatDuration, 
  markdownToPlainText,
  AI_PROVIDER_LABELS,
  ANALYSIS_TYPE_LABELS,
  DownloadProgress 
} from './DownloadUtils';

// PDF設定
const PDF_CONFIG = {
  format: 'a4' as const,
  orientation: 'portrait' as const,
  unit: 'mm' as const,
  margins: {
    top: 20,
    right: 20,
    bottom: 20,
    left: 20,
  },
  pageWidth: 210, // A4幅
  pageHeight: 297, // A4高さ
  lineHeight: 6,
  fontSize: {
    title: 18,
    heading: 14,
    body: 10,
    small: 8,
  },
};

/**
 * PDF生成クラス
 */
export class PDFGenerator {
  private pdf: jsPDF;
  private currentY: number;
  private progress: DownloadProgress;

  constructor(progress?: DownloadProgress) {
    this.pdf = new jsPDF({
      orientation: PDF_CONFIG.orientation,
      unit: PDF_CONFIG.unit,
      format: PDF_CONFIG.format,
    });
    this.currentY = PDF_CONFIG.margins.top;
    this.progress = progress || new DownloadProgress();
  }

  /**
   * 分析結果をPDFとして生成・ダウンロード
   */
  async generatePDF(data: AnalysisResultData, options: DownloadOptions): Promise<void> {
    try {
      this.progress.update(10, 'PDF生成を開始しています...');

      // 表紙を生成
      this.generateCoverPage(data);
      this.progress.update(30, '表紙を生成しました');

      // 新しいページを開始
      this.addNewPage();

      // 分析結果を生成
      if (data.singleResult) {
        this.generateSingleResultContent(data.singleResult);
        this.progress.update(70, '単一AI分析結果を生成しました');
      } else if (data.councilResult) {
        this.generateCouncilResultContent(data.councilResult);
        this.progress.update(70, 'Council分析結果を生成しました');
      }

      // メタデータを含める場合
      if (options.includeMetadata) {
        this.addNewPage();
        this.generateMetadataPage(data);
        this.progress.update(85, 'メタデータを生成しました');
      }

      // PDFを保存
      const fileName = generateFileName(data, 'pdf', options.customFileName);
      this.pdf.save(fileName);
      
      this.progress.complete();
      console.log(`[PDF] Generated successfully: ${fileName}`);
      
    } catch (error) {
      this.progress.error('PDF生成に失敗しました');
      console.error('[PDF] Generation failed:', error);
      throw new Error('PDF生成に失敗しました');
    }
  }

  /**
   * 表紙ページを生成
   */
  private generateCoverPage(data: AnalysisResultData): void {
    const { metadata, singleResult, councilResult } = data;
    
    // タイトル
    this.pdf.setFontSize(PDF_CONFIG.fontSize.title);
    this.pdf.setFont('helvetica', 'bold');
    this.addText('戦略分析結果レポート', { align: 'center' });
    this.currentY += 20;

    // 分析情報
    this.pdf.setFontSize(PDF_CONFIG.fontSize.body);
    this.pdf.setFont('helvetica', 'normal');
    
    const analysisType = ANALYSIS_TYPE_LABELS[metadata.analysisType] || metadata.analysisType;
    const aiName = metadata.analysisMode === 'council' 
      ? 'Council（合議制）' 
      : AI_PROVIDER_LABELS[(singleResult?.aiProvider || 'claude') as keyof typeof AI_PROVIDER_LABELS];
    
    const infoItems = [
      `分析日時: ${formatDateTime(metadata.createdAt)}`,
      `分析タイプ: ${analysisType}`,
      `使用AI: ${aiName}`,
      `処理時間: ${formatDuration(singleResult?.durationMs || councilResult?.totalDurationMs || 0)}`,
    ];

    if (metadata.location) {
      infoItems.push(`対象地域: ${metadata.location}`);
    }

    infoItems.forEach(item => {
      this.addText(item);
      this.currentY += PDF_CONFIG.lineHeight + 2;
    });

    // 区切り線
    this.currentY += 10;
    this.pdf.setDrawColor(200, 200, 200);
    this.pdf.line(
      PDF_CONFIG.margins.left, 
      this.currentY, 
      PDF_CONFIG.pageWidth - PDF_CONFIG.margins.right, 
      this.currentY
    );
    this.currentY += 10;

    // 概要
    this.pdf.setFontSize(PDF_CONFIG.fontSize.heading);
    this.pdf.setFont('helvetica', 'bold');
    this.addText('概要');
    this.currentY += PDF_CONFIG.lineHeight + 2;

    this.pdf.setFontSize(PDF_CONFIG.fontSize.body);
    this.pdf.setFont('helvetica', 'normal');
    
    let summary = '';
    if (metadata.analysisMode === 'council') {
      summary = `複数のAI（${councilResult?.stage1.responses.filter(r => !r.error).length || 0}体）による合議制分析を実施し、`;
      summary += 'ピアレビューを経て最終的な統合結果を生成しました。';
    } else {
      summary = `${aiName}による${analysisType}を実施しました。`;
    }
    
    this.addTextWrapped(summary);
  }

  /**
   * 単一AI分析結果のコンテンツを生成
   */
  private generateSingleResultContent(result: { content: string; aiProvider: string; durationMs: number }): void {
    // セクションタイトル
    this.pdf.setFontSize(PDF_CONFIG.fontSize.heading);
    this.pdf.setFont('helvetica', 'bold');
    this.addText('分析結果');
    this.currentY += PDF_CONFIG.lineHeight + 4;

    // AI情報
    this.pdf.setFontSize(PDF_CONFIG.fontSize.small);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setTextColor(100, 100, 100);
    this.addText(`${AI_PROVIDER_LABELS[result.aiProvider as keyof typeof AI_PROVIDER_LABELS]} / ${formatDuration(result.durationMs)}`);
    this.currentY += PDF_CONFIG.lineHeight + 4;

    // 分析結果本文
    this.pdf.setFontSize(PDF_CONFIG.fontSize.body);
    this.pdf.setTextColor(0, 0, 0);
    
    const plainText = markdownToPlainText(result.content);
    this.addTextWrapped(plainText);
  }

  /**
   * Council分析結果のコンテンツを生成
   */
  private generateCouncilResultContent(result: any): void {
    // 最終統合結果
    this.pdf.setFontSize(PDF_CONFIG.fontSize.heading);
    this.pdf.setFont('helvetica', 'bold');
    this.addText('最終統合結果');
    this.currentY += PDF_CONFIG.lineHeight + 4;

    this.pdf.setFontSize(PDF_CONFIG.fontSize.small);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setTextColor(100, 100, 100);
    this.addText(`議長: ${AI_PROVIDER_LABELS[result.stage3.chairman as keyof typeof AI_PROVIDER_LABELS]} / ${formatDuration(result.stage3.durationMs)}`);
    this.currentY += PDF_CONFIG.lineHeight + 4;

    this.pdf.setFontSize(PDF_CONFIG.fontSize.body);
    this.pdf.setTextColor(0, 0, 0);
    const finalContent = markdownToPlainText(result.stage3.content);
    this.addTextWrapped(finalContent);

    // ピアレビュー結果
    if (result.stage2 && result.stage2.aggregateRankings.length > 0) {
      this.currentY += 10;
      this.pdf.setFontSize(PDF_CONFIG.fontSize.heading);
      this.pdf.setFont('helvetica', 'bold');
      this.addText('ピアレビュー結果（AI相互評価）');
      this.currentY += PDF_CONFIG.lineHeight + 4;

      this.pdf.setFontSize(PDF_CONFIG.fontSize.body);
      this.pdf.setFont('helvetica', 'normal');

      result.stage2.aggregateRankings.forEach((ranking: any, index: number) => {
        const rankText = `${index + 1}位: ${AI_PROVIDER_LABELS[ranking.model as keyof typeof AI_PROVIDER_LABELS]} (平均 ${ranking.averageRank.toFixed(2)}位 / ${ranking.votes}票)`;
        this.addText(rankText);
        this.currentY += PDF_CONFIG.lineHeight + 1;
      });
    }

    // 各AIの個別回答（要約版）
    this.currentY += 10;
    this.pdf.setFontSize(PDF_CONFIG.fontSize.heading);
    this.pdf.setFont('helvetica', 'bold');
    this.addText('各AIの個別回答（要約）');
    this.currentY += PDF_CONFIG.lineHeight + 4;

    const validResponses = result.stage1.responses.filter((r: any) => !r.error);
    validResponses.forEach((response: any) => {
      this.pdf.setFontSize(PDF_CONFIG.fontSize.body);
      this.pdf.setFont('helvetica', 'bold');
      this.addText(`${AI_PROVIDER_LABELS[response.model as keyof typeof AI_PROVIDER_LABELS]} (${formatDuration(response.durationMs)})`);
      this.currentY += PDF_CONFIG.lineHeight + 2;

      this.pdf.setFont('helvetica', 'normal');
      const summary = markdownToPlainText(response.content).substring(0, 500) + '...';
      this.addTextWrapped(summary);
      this.currentY += 5;
    });
  }

  /**
   * メタデータページを生成
   */
  private generateMetadataPage(data: AnalysisResultData): void {
    this.pdf.setFontSize(PDF_CONFIG.fontSize.heading);
    this.pdf.setFont('helvetica', 'bold');
    this.addText('分析詳細情報');
    this.currentY += PDF_CONFIG.lineHeight + 4;

    this.pdf.setFontSize(PDF_CONFIG.fontSize.body);
    this.pdf.setFont('helvetica', 'normal');

    const metadataItems = [
      `分析ID: ${data.metadata.analysisId}`,
      `ユーザーID: ${data.metadata.userId}`,
      `分析モード: ${data.metadata.analysisMode === 'council' ? '合議制' : '単一AI'}`,
      `エクスポート日時: ${formatDateTime(new Date())}`,
    ];

    if (data.inputData) {
      if (data.inputData.productIds) {
        metadataItems.push(`対象商品数: ${data.inputData.productIds.length}件`);
      }
      if (data.inputData.marketDataSelection) {
        const selection = data.inputData.marketDataSelection;
        const counts = [
          selection.trendIds?.length || 0,
          selection.priceIds?.length || 0,
          selection.competitorIds?.length || 0,
        ];
        metadataItems.push(`使用市場調査データ: ${counts.join(', ')}件 (トレンド/価格/競合)`);
      }
    }

    metadataItems.forEach(item => {
      this.addText(item);
      this.currentY += PDF_CONFIG.lineHeight + 2;
    });
  }

  /**
   * テキストを追加（1行）
   */
  private addText(text: string, options: { align?: 'left' | 'center' | 'right' } = {}): void {
    const x = options.align === 'center' 
      ? PDF_CONFIG.pageWidth / 2 
      : options.align === 'right'
      ? PDF_CONFIG.pageWidth - PDF_CONFIG.margins.right
      : PDF_CONFIG.margins.left;

    this.pdf.text(text, x, this.currentY, { align: options.align || 'left' });
  }

  /**
   * 長いテキストを折り返して追加
   */
  private addTextWrapped(text: string): void {
    const maxWidth = PDF_CONFIG.pageWidth - PDF_CONFIG.margins.left - PDF_CONFIG.margins.right;
    const lines = this.pdf.splitTextToSize(text, maxWidth);
    
    lines.forEach((line: string) => {
      // ページの終わりに近づいたら新しいページを追加
      if (this.currentY > PDF_CONFIG.pageHeight - PDF_CONFIG.margins.bottom - 20) {
        this.addNewPage();
      }
      
      this.pdf.text(line, PDF_CONFIG.margins.left, this.currentY);
      this.currentY += PDF_CONFIG.lineHeight;
    });
  }

  /**
   * 新しいページを追加
   */
  private addNewPage(): void {
    this.pdf.addPage();
    this.currentY = PDF_CONFIG.margins.top;
    
    // ページ番号を追加
    const pageNum = this.pdf.getCurrentPageInfo().pageNumber;
    this.pdf.setFontSize(PDF_CONFIG.fontSize.small);
    this.pdf.setTextColor(150, 150, 150);
    this.pdf.text(
      `- ${pageNum} -`, 
      PDF_CONFIG.pageWidth / 2, 
      PDF_CONFIG.pageHeight - 10, 
      { align: 'center' }
    );
    
    // フッター
    this.pdf.text(
      'Beauty Project - 戦略分析システム', 
      PDF_CONFIG.margins.left, 
      PDF_CONFIG.pageHeight - 10
    );
    
    this.pdf.setTextColor(0, 0, 0);
  }
}

/**
 * PDF生成のメイン関数
 */
export async function generatePDF(
  data: AnalysisResultData, 
  options: DownloadOptions,
  onProgress?: (progress: number, message: string) => void
): Promise<void> {
  const progress = new DownloadProgress(onProgress);
  const generator = new PDFGenerator(progress);
  await generator.generatePDF(data, options);
}
