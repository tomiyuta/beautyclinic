import React, { useState } from 'react';
import Button from '@atlaskit/button';
import Spinner from '@atlaskit/spinner';
import DownloadIcon from '@atlaskit/icon/glyph/download';
import CodeIcon from '@atlaskit/icon/glyph/code';
import SectionMessage from '@atlaskit/section-message';
import type { AnalysisResultData, DownloadOptions } from './DownloadUtils';
import { generatePDF } from './PDFGenerator';
import { downloadAsJSON, executeDownload } from './DownloadUtils';

interface DownloadButtonProps {
  data: AnalysisResultData;
  className?: string;
}

interface DownloadState {
  isDownloading: boolean;
  progress: number;
  message: string;
  error: string | null;
}

/**
 * ダウンロードボタンコンポーネント
 */
export default function DownloadButton({ data, className }: DownloadButtonProps) {
  const [downloadState, setDownloadState] = useState<DownloadState>({
    isDownloading: false,
    progress: 0,
    message: '',
    error: null,
  });

  // プログレス更新ハンドラー
  const handleProgress = (progress: number, message: string) => {
    setDownloadState(prev => ({
      ...prev,
      progress: Math.max(0, progress),
      message,
      error: progress < 0 ? message : null,
    }));
  };

  // ダウンロード完了ハンドラー
  const handleDownloadComplete = () => {
    setDownloadState({
      isDownloading: false,
      progress: 100,
      message: 'ダウンロード完了',
      error: null,
    });

    // 3秒後にメッセージをクリア
    setTimeout(() => {
      setDownloadState(prev => ({
        ...prev,
        progress: 0,
        message: '',
      }));
    }, 3000);
  };

  // PDFダウンロード
  const handleDownloadPDF = async () => {
    setDownloadState({
      isDownloading: true,
      progress: 0,
      message: 'PDF生成を準備中...',
      error: null,
    });

    try {
      const options: DownloadOptions = {
        format: 'pdf',
        includeMetadata: true,
        includeInputData: true,
      };

      await executeDownload(
        () => generatePDF(data, options, handleProgress),
        'PDF'
      );

      handleDownloadComplete();
    } catch (error) {
      console.error('[DownloadButton] PDF download failed:', error);
      setDownloadState(prev => ({
        ...prev,
        isDownloading: false,
        error: error instanceof Error ? error.message : 'PDF生成に失敗しました',
      }));
    }
  };

  // JSONダウンロード
  const handleDownloadJSON = async () => {
    setDownloadState({
      isDownloading: true,
      progress: 0,
      message: 'JSON形式で準備中...',
      error: null,
    });

    try {
      const options: DownloadOptions = {
        format: 'json',
        includeMetadata: true,
        includeInputData: true,
      };

      await executeDownload(
        () => {
          handleProgress(50, 'JSONデータを構築中...');
          downloadAsJSON(data, options);
          handleProgress(100, 'JSON形式でダウンロード完了');
        },
        'JSON'
      );

      handleDownloadComplete();
    } catch (error) {
      console.error('[DownloadButton] JSON download failed:', error);
      setDownloadState(prev => ({
        ...prev,
        isDownloading: false,
        error: error instanceof Error ? error.message : 'JSON形式でのダウンロードに失敗しました',
      }));
    }
  };

  return (
    <div className={className}>
      {/* ダウンロードボタン */}
      <div
        style={{
          marginTop: '24px',
          paddingTop: '16px',
          borderTop: '1px solid #DFE1E6',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <Button
          appearance="primary"
          onClick={handleDownloadPDF}
          isDisabled={downloadState.isDownloading}
          iconBefore={
            downloadState.isDownloading && downloadState.progress > 0 && downloadState.progress < 100 ? (
              <Spinner size="small" />
            ) : (
              <DownloadIcon label="PDF download" />
            )
          }
        >
          📄 PDFダウンロード
        </Button>

        <Button
          appearance="subtle"
          onClick={handleDownloadJSON}
          isDisabled={downloadState.isDownloading}
          iconBefore={<CodeIcon label="JSON download" />}
        >
          💾 JSON形式
        </Button>

        {/* プログレス表示 */}
        {downloadState.isDownloading && downloadState.message && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              color: '#6B778C',
            }}
          >
            {downloadState.progress > 0 && downloadState.progress < 100 && (
              <Spinner size="small" />
            )}
            <span>{downloadState.message}</span>
            {downloadState.progress > 0 && downloadState.progress < 100 && (
              <span>({downloadState.progress}%)</span>
            )}
          </div>
        )}
      </div>

      {/* 完了メッセージ */}
      {downloadState.progress === 100 && downloadState.message && !downloadState.error && (
        <div style={{ marginTop: '12px' }}>
          <SectionMessage appearance="success" title="ダウンロード完了">
            <p>{downloadState.message}</p>
          </SectionMessage>
        </div>
      )}

      {/* エラーメッセージ */}
      {downloadState.error && (
        <div style={{ marginTop: '12px' }}>
          <SectionMessage appearance="error" title="ダウンロードエラー">
            <p>{downloadState.error}</p>
            <div style={{ marginTop: '8px' }}>
              <Button
                appearance="subtle"
                onClick={() => setDownloadState(prev => ({ ...prev, error: null }))}
              >
                閉じる
              </Button>
            </div>
          </SectionMessage>
        </div>
      )}

      {/* ダウンロード情報 */}
      <div
        style={{
          marginTop: '12px',
          padding: '12px',
          backgroundColor: '#F4F5F7',
          borderRadius: '4px',
          fontSize: '12px',
          color: '#6B778C',
        }}
      >
        <div style={{ marginBottom: '4px' }}>
          <strong>📋 ダウンロード内容:</strong>
        </div>
        <ul style={{ margin: '0', paddingLeft: '16px' }}>
          <li>分析結果の全文</li>
          <li>分析メタデータ（日時、AI、処理時間等）</li>
          <li>入力データ（商品、市場調査選択等）</li>
          {data.councilResult && (
            <li>Council分析の場合: 各AI回答 + ピアレビュー + 最終統合</li>
          )}
        </ul>
        <div style={{ marginTop: '8px', fontSize: '11px' }}>
          💡 PDFは印刷・共有用、JSONは開発・データ分析用に最適化されています
        </div>
      </div>
    </div>
  );
}

/**
 * シンプルなダウンロードボタン（コンパクト版）
 */
export function CompactDownloadButton({ data, className }: DownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleQuickPDF = async () => {
    setIsDownloading(true);
    try {
      const options: DownloadOptions = {
        format: 'pdf',
        includeMetadata: false,
        includeInputData: false,
      };
      await generatePDF(data, options);
    } catch (error) {
      console.error('[CompactDownloadButton] PDF download failed:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className={className}>
      <Button
        appearance="subtle"
        onClick={handleQuickPDF}
        isDisabled={isDownloading}
        iconBefore={
          isDownloading ? (
            <Spinner size="small" />
          ) : (
            <DownloadIcon label="Quick PDF download" />
          )
        }
        spacing="compact"
      >
        PDF
      </Button>
    </div>
  );
}
