import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface StrategyExportData {
  id: number;
  analysisDate: Date;
  priceRecommendations: unknown;
  campaignProposals: unknown;
  newTreatmentSuggestions: unknown;
  marketingStrategy: unknown;
  userFeedback: string | null;
  implementationStatus: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function exportToPDF(data: StrategyExportData): Promise<Buffer> {
  const doc = new jsPDF();
  let yPos = 20;

  // タイトル
  doc.setFontSize(18);
  doc.text("戦略提案書", 105, yPos, { align: "center" });
  yPos += 15;

  // 基本情報
  doc.setFontSize(12);
  doc.text(`提案ID: ${data.id}`, 20, yPos);
  yPos += 7;
  doc.text(
    `作成日: ${data.createdAt.toLocaleString("ja-JP")}`,
    20,
    yPos,
  );
  yPos += 7;
  doc.text(`ステータス: ${data.implementationStatus}`, 20, yPos);
  yPos += 10;

  // 価格設定提案
  if (data.priceRecommendations) {
    doc.setFontSize(14);
    doc.text("価格設定提案", 20, yPos);
    yPos += 8;

    const priceData =
      typeof data.priceRecommendations === "string"
        ? (() => {
            try {
              return JSON.parse(data.priceRecommendations);
            } catch {
              return data.priceRecommendations; // テキスト形式として返す
            }
          })()
        : data.priceRecommendations;

    if (Array.isArray(priceData) || (priceData && typeof priceData === "object" && Array.isArray(priceData.recommendations))) {
      const recommendations = Array.isArray(priceData)
        ? priceData
        : priceData.recommendations || [];

      const tableData = recommendations.map((rec: Record<string, unknown>) => [
        String(rec.productName || ""),
        String(rec.currentPrice || ""),
        String(rec.recommendedPrice || ""),
        String(rec.reason || ""),
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [["商品名", "現在価格", "推奨価格", "理由"]],
        body: tableData,
        styles: { fontSize: 8 },
      });
      yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    } else {
      doc.setFontSize(10);
      const priceText = typeof priceData === "string" ? priceData : JSON.stringify(priceData, null, 2);
      doc.text(priceText.substring(0, 200), 20, yPos);
      yPos += 20;
    }
  }

  // キャンペーン案
  if (data.campaignProposals) {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.text("キャンペーン案", 20, yPos);
    yPos += 8;

    const campaignData =
      typeof data.campaignProposals === "string"
        ? (() => {
            try {
              return JSON.parse(data.campaignProposals);
            } catch {
              return data.campaignProposals; // テキスト形式として返す
            }
          })()
        : data.campaignProposals;

    if (campaignData && typeof campaignData === "object" && Array.isArray(campaignData.campaigns)) {
      campaignData.campaigns.forEach((campaign: Record<string, unknown>, index: number) => {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(12);
        doc.text(`案 ${index + 1}: ${String(campaign.title || "")}`, 20, yPos);
        yPos += 6;
        doc.setFontSize(10);
        doc.text(String(campaign.description || ""), 20, yPos, { maxWidth: 170 });
        yPos += 12;
      });
    } else {
      doc.setFontSize(10);
      const campaignText = typeof campaignData === "string" ? campaignData : JSON.stringify(campaignData, null, 2);
      doc.text(campaignText.substring(0, 200), 20, yPos);
      yPos += 20;
    }
  }

  // 新施術提案
  if (data.newTreatmentSuggestions) {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.text("新施術導入提案", 20, yPos);
    yPos += 8;

    const treatmentData =
      typeof data.newTreatmentSuggestions === "string"
        ? (() => {
            try {
              return JSON.parse(data.newTreatmentSuggestions);
            } catch {
              return data.newTreatmentSuggestions; // テキスト形式として返す
            }
          })()
        : data.newTreatmentSuggestions;

    if (treatmentData && typeof treatmentData === "object" && Array.isArray(treatmentData.suggestions)) {
      const tableData = treatmentData.suggestions.map((sug: Record<string, unknown>) => [
        String(sug.treatmentName || ""),
        String(sug.reason || ""),
        String(sug.marketDemand || ""),
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [["施術名", "導入理由", "市場需要"]],
        body: tableData,
        styles: { fontSize: 8 },
      });
      yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    } else {
      doc.setFontSize(10);
      const treatmentText = typeof treatmentData === "string" ? treatmentData : JSON.stringify(treatmentData, null, 2);
      doc.text(treatmentText.substring(0, 200), 20, yPos);
      yPos += 20;
    }
  }

  // マーケティング戦略
  if (data.marketingStrategy) {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.text("マーケティング戦略", 20, yPos);
    yPos += 8;

    const strategyData =
      typeof data.marketingStrategy === "string"
        ? (() => {
            try {
              return JSON.parse(data.marketingStrategy);
            } catch {
              return data.marketingStrategy; // テキスト形式として返す
            }
          })()
        : data.marketingStrategy;

    doc.setFontSize(10);
    const strategyText = typeof strategyData === "string" ? strategyData : JSON.stringify(strategyData, null, 2);
    const lines = doc.splitTextToSize(strategyText, 170);
    doc.text(lines, 20, yPos);
  }

  // フィードバック
  if (data.userFeedback) {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.text("フィードバック", 20, yPos);
    yPos += 8;
    doc.setFontSize(10);
    const feedbackLines = doc.splitTextToSize(data.userFeedback, 170);
    doc.text(feedbackLines, 20, yPos);
  }

  return Buffer.from(doc.output("arraybuffer"));
}

export async function exportToExcel(data: StrategyExportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("戦略提案書");

  // タイトル
  worksheet.mergeCells("A1:D1");
  worksheet.getCell("A1").value = "戦略提案書";
  worksheet.getCell("A1").font = { size: 16, bold: true };
  worksheet.getCell("A1").alignment = { horizontal: "center" };

  let row = 3;

  // 基本情報
  worksheet.getCell(`A${row}`).value = "提案ID";
  worksheet.getCell(`B${row}`).value = data.id;
  row++;
  worksheet.getCell(`A${row}`).value = "作成日";
  worksheet.getCell(`B${row}`).value = data.createdAt;
  row++;
  worksheet.getCell(`A${row}`).value = "ステータス";
  worksheet.getCell(`B${row}`).value = data.implementationStatus;
  row += 2;

  // 価格設定提案
  if (data.priceRecommendations) {
    const priceData =
      typeof data.priceRecommendations === "string"
        ? (() => {
            try {
              return JSON.parse(data.priceRecommendations);
            } catch {
              return data.priceRecommendations; // テキスト形式として返す
            }
          })()
        : data.priceRecommendations;

    worksheet.getCell(`A${row}`).value = "価格設定提案";
    worksheet.getCell(`A${row}`).font = { size: 14, bold: true };
    row++;

    if (Array.isArray(priceData) || (priceData && typeof priceData === "object" && Array.isArray(priceData.recommendations))) {
      const recommendations = Array.isArray(priceData)
        ? priceData
        : priceData.recommendations || [];

      worksheet.addTable({
        name: "PriceRecommendations",
        ref: `A${row}`,
        headerRow: true,
        style: {
          theme: "TableStyleMedium9",
        },
        columns: [
          { name: "商品名", filterButton: true },
          { name: "現在価格", filterButton: true },
          { name: "推奨価格", filterButton: true },
          { name: "理由", filterButton: true },
        ],
        rows: recommendations.map((rec: Record<string, unknown>) => [
          String(rec.productName || ""),
          String(rec.currentPrice || ""),
          String(rec.recommendedPrice || ""),
          String(rec.reason || ""),
        ]),
      });
      row += recommendations.length + 2;
    } else {
      const priceText = typeof priceData === "string" ? priceData : JSON.stringify(priceData, null, 2);
      worksheet.getCell(`A${row}`).value = priceText;
      row += 10;
    }
  }

  // キャンペーン案
  if (data.campaignProposals) {
    worksheet.getCell(`A${row}`).value = "キャンペーン案";
    worksheet.getCell(`A${row}`).font = { size: 14, bold: true };
    row++;

    const campaignData =
      typeof data.campaignProposals === "string"
        ? (() => {
            try {
              return JSON.parse(data.campaignProposals);
            } catch {
              return data.campaignProposals; // テキスト形式として返す
            }
          })()
        : data.campaignProposals;

    if (campaignData && typeof campaignData === "object" && Array.isArray(campaignData.campaigns)) {
      campaignData.campaigns.forEach((campaign: Record<string, unknown>, index: number) => {
        worksheet.getCell(`A${row}`).value = `案 ${index + 1}`;
        worksheet.getCell(`A${row}`).font = { bold: true };
        worksheet.getCell(`B${row}`).value = String(campaign.title || "");
        row++;
        worksheet.getCell(`B${row}`).value = String(campaign.description || "");
        worksheet.getCell(`B${row}`).alignment = { wrapText: true };
        row++;
        worksheet.getCell(`B${row}`).value = `プロモーション: ${String(campaign.promotion || "")}`;
        row += 2;
      });
    } else {
      const campaignText = typeof campaignData === "string" ? campaignData : JSON.stringify(campaignData, null, 2);
      worksheet.getCell(`A${row}`).value = campaignText;
      row += 10;
    }
  }

  // 新施術提案
  if (data.newTreatmentSuggestions) {
    worksheet.getCell(`A${row}`).value = "新施術導入提案";
    worksheet.getCell(`A${row}`).font = { size: 14, bold: true };
    row++;

    const treatmentData =
      typeof data.newTreatmentSuggestions === "string"
        ? (() => {
            try {
              return JSON.parse(data.newTreatmentSuggestions);
            } catch {
              return data.newTreatmentSuggestions; // テキスト形式として返す
            }
          })()
        : data.newTreatmentSuggestions;

    if (treatmentData && typeof treatmentData === "object" && Array.isArray(treatmentData.suggestions)) {
      worksheet.addTable({
        name: "TreatmentSuggestions",
        ref: `A${row}`,
        headerRow: true,
        style: {
          theme: "TableStyleMedium9",
        },
        columns: [
          { name: "施術名", filterButton: true },
          { name: "導入理由", filterButton: true },
          { name: "市場需要", filterButton: true },
          { name: "想定価格", filterButton: true },
        ],
        rows: treatmentData.suggestions.map((sug: Record<string, unknown>) => [
          String(sug.treatmentName || ""),
          String(sug.reason || ""),
          String(sug.marketDemand || ""),
          String(
            (sug.expectedPrice as Record<string, unknown>)?.sellingPrice || "",
          ),
        ]),
      });
      row += treatmentData.suggestions.length + 2;
    } else {
      const treatmentText = typeof treatmentData === "string" ? treatmentData : JSON.stringify(treatmentData, null, 2);
      worksheet.getCell(`A${row}`).value = treatmentText;
      row += 10;
    }
  }

  // マーケティング戦略
  if (data.marketingStrategy) {
    worksheet.getCell(`A${row}`).value = "マーケティング戦略";
    worksheet.getCell(`A${row}`).font = { size: 14, bold: true };
    row++;
    const strategyData =
      typeof data.marketingStrategy === "string"
        ? (() => {
            try {
              return JSON.parse(data.marketingStrategy);
            } catch {
              return data.marketingStrategy; // テキスト形式として返す
            }
          })()
        : data.marketingStrategy;
    const strategyText = typeof strategyData === "string" ? strategyData : JSON.stringify(strategyData, null, 2);
    worksheet.getCell(`A${row}`).value = strategyText;
    worksheet.getCell(`A${row}`).alignment = { wrapText: true };
    row += 10;
  }

  // フィードバック
  if (data.userFeedback) {
    worksheet.getCell(`A${row}`).value = "フィードバック";
    worksheet.getCell(`A${row}`).font = { size: 14, bold: true };
    row++;
    worksheet.getCell(`A${row}`).value = data.userFeedback;
    worksheet.getCell(`A${row}`).alignment = { wrapText: true };
  }

  // 列幅の調整
  worksheet.columns.forEach((column) => {
    column.width = 20;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

