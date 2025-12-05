"use client";

import { useState } from "react";
import Button from "@atlaskit/button";
import { saveAs } from "file-saver";
import type { ResearchHistoryItem } from "@/components/research/history/useResearchHistory";
import DownloadIcon from "@atlaskit/icon/glyph/download";
import CodeIcon from "@atlaskit/icon/glyph/code";
import ShareIcon from "@atlaskit/icon/glyph/share";

interface ExportActionsProps {
  item: ResearchHistoryItem;
}

export function ExportActions({ item }: ExportActionsProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      const rawData = item.raw as any;
      const content = rawData?.processedData || rawData?.trendData || rawData?.content || item.summary;
      const contentText = typeof content === "string" ? content : JSON.stringify(content, null, 2);

      // 簡易的なPDF生成（jsPDFを使用）
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      
      // タイトル
      doc.setFontSize(16);
      doc.text(item.query, 20, 20);
      
      // メタ情報
      doc.setFontSize(10);
      doc.text(`作成日: ${item.createdAt.toLocaleDateString("ja-JP")}`, 20, 30);
      if (item.aiAgent) {
        doc.text(`AI: ${item.aiAgent}`, 20, 35);
      }
      
      // コンテンツ（長文の場合は複数ページに分割）
      doc.setFontSize(12);
      const lines = doc.splitTextToSize(contentText, 170);
      let y = 45;
      lines.forEach((line: string) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, 20, y);
        y += 7;
      });
      
      doc.save(`${item.query}-${Date.now()}.pdf`);
    } catch (error) {
      console.error("PDF export failed:", error);
      alert("PDFのエクスポートに失敗しました");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportJSON = () => {
    try {
      const rawData = item.raw as any;
      const jsonData = {
        metadata: {
          id: item.id,
          type: item.type,
          query: item.query,
          createdAt: item.createdAt.toISOString(),
          aiAgent: item.aiAgent,
          platform: item.platform,
        },
        data: rawData,
      };

      const jsonString = JSON.stringify(jsonData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json;charset=utf-8" });
      const fileName = `${item.query}-${Date.now()}.json`;
      saveAs(blob, fileName);
    } catch (error) {
      console.error("JSON export failed:", error);
      alert("JSONのエクスポートに失敗しました");
    }
  };

  const handleShare = async () => {
    try {
      const tabMap: Record<string, string> = {
        market: "MARKET",
        sns: "SNS",
        strategy: "STRATEGY",
      };
      const tab = tabMap[item.type] || "MARKET";
      const url = `${window.location.origin}/workspace?tab=${tab}&id=${item.id}`;
      
      if (navigator.share) {
        await navigator.share({
          title: item.query,
          text: item.summary,
          url: url,
        });
      } else {
        // フォールバック: クリップボードにコピー
        await navigator.clipboard.writeText(url);
        alert("リンクをクリップボードにコピーしました");
      }
    } catch (error) {
      console.error("Share failed:", error);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        appearance="subtle"
        iconBefore={<DownloadIcon label="PDF" />}
        onClick={handleExportPDF}
        isDisabled={isExporting}
      >
        PDF
      </Button>
      <Button
        appearance="subtle"
        iconBefore={<CodeIcon label="JSON" />}
        onClick={handleExportJSON}
      >
        JSON
      </Button>
      <Button
        appearance="subtle"
        iconBefore={<ShareIcon label="Share" />}
        onClick={handleShare}
      >
        共有
      </Button>
    </div>
  );
}

