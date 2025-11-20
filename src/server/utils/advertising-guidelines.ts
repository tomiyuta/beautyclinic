/**
 * 医療広告ガイドライン対応
 * 禁止ワードチェックと自動修正機能
 */

/**
 * 医療広告で禁止される表現のリスト
 */
export const PROHIBITED_PHRASES = [
  "完全に治る",
  "必ず治る",
  "絶対に治る",
  "100%治る",
  "確実に治る",
  "必ず効果がある",
  "絶対に効果がある",
  "完全に効果がある",
  "必ず改善する",
  "絶対に改善する",
  "完全に改善する",
  "No.1",
  "一番",
  "最高",
  "最強",
  "唯一",
  "他にない",
  "他を圧倒",
  "革命的な",
  "驚異的な",
  "奇跡的な",
  "魔法のような",
  "即効性",
  "即座に",
  "すぐに治る",
  "たった1回で",
  "1回で完璧",
  "副作用なし",
  "リスクなし",
  "痛みなし",
  "ダウンタイムなし",
];

/**
 * 自動付与する注意書き
 */
export const DEFAULT_DISCLAIMERS = [
  "※効果には個人差があります",
  "※施術内容により、効果の程度や持続期間は異なります",
  "※事前のカウンセリングで、ご希望やご予算に合わせた最適なプランをご提案いたします",
  "※施術前には必ず医師による診察・説明を受けていただきます",
];

/**
 * テキスト内に禁止表現が含まれているかチェック
 */
export function checkProhibitedPhrases(text: string): {
  hasProhibited: boolean;
  foundPhrases: string[];
} {
  const foundPhrases: string[] = [];

  for (const phrase of PROHIBITED_PHRASES) {
    if (text.includes(phrase)) {
      foundPhrases.push(phrase);
    }
  }

  return {
    hasProhibited: foundPhrases.length > 0,
    foundPhrases,
  };
}

/**
 * 禁止表現を自動的に修正（警告付きで置換）
 */
export function replaceProhibitedPhrases(text: string): {
  cleanedText: string;
  replacements: Array<{ original: string; replaced: string }>;
} {
  const replacements: Array<{ original: string; replaced: string }> = [];
  let cleanedText = text;

  for (const phrase of PROHIBITED_PHRASES) {
    if (cleanedText.includes(phrase)) {
      // 禁止表現をより適切な表現に置換
      const replacement = getReplacement(phrase);
      cleanedText = cleanedText.replace(new RegExp(phrase, "g"), replacement);
      replacements.push({ original: phrase, replaced: replacement });
    }
  }

  return { cleanedText, replacements };
}

/**
 * 禁止表現の置換マッピング
 */
function getReplacement(phrase: string): string {
  const replacements: Record<string, string> = {
    "完全に治る": "改善が期待できます",
    "必ず治る": "効果が期待できます",
    "絶対に治る": "改善が期待できます",
    "100%治る": "効果が期待できます",
    "確実に治る": "効果が期待できます",
    "必ず効果がある": "効果が期待できます",
    "絶対に効果がある": "効果が期待できます",
    "完全に効果がある": "効果が期待できます",
    "必ず改善する": "改善が期待できます",
    "絶対に改善する": "改善が期待できます",
    "完全に改善する": "改善が期待できます",
    "No.1": "高い評価",
    "一番": "高い評価",
    "最高": "高品質",
    "最強": "効果的な",
    "唯一": "特徴的な",
    "他にない": "独自の",
    "他を圧倒": "優れた",
    "革命的な": "先進的な",
    "驚異的な": "効果的な",
    "奇跡的な": "効果的な",
    "魔法のような": "効果的な",
    "即効性": "効果が期待できます",
    "即座に": "早期に",
    "すぐに治る": "改善が期待できます",
    "たった1回で": "1回の施術で",
    "1回で完璧": "効果が期待できます",
    "副作用なし": "安全性に配慮",
    "リスクなし": "安全性に配慮",
    "痛みなし": "痛みを最小限に",
    "ダウンタイムなし": "ダウンタイムを最小限に",
  };

  return replacements[phrase] || phrase;
}

/**
 * 注意書きを自動付与
 */
export function addDisclaimers(text: string, disclaimers?: string[]): string {
  const defaultDisclaimers = disclaimers || DEFAULT_DISCLAIMERS;
  const disclaimerText = "\n\n" + defaultDisclaimers.join("\n");

  // 既に注意書きが含まれている場合は追加しない
  if (text.includes("効果には個人差があります") || text.includes("※")) {
    return text;
  }

  return text + disclaimerText;
}

/**
 * テキストをクリーンアップ（禁止表現のチェックと修正、注意書きの付与）
 */
export function cleanTextForAdvertising(text: string): {
  cleanedText: string;
  warnings: string[];
} {
  const warnings: string[] = [];

  // 禁止表現のチェック
  const checkResult = checkProhibitedPhrases(text);
  if (checkResult.hasProhibited) {
    warnings.push(`禁止表現が検出されました: ${checkResult.foundPhrases.join(", ")}`);
  }

  // 禁止表現の置換
  const replaceResult = replaceProhibitedPhrases(text);
  if (replaceResult.replacements.length > 0) {
    warnings.push(
      `以下の表現を修正しました: ${replaceResult.replacements.map((r) => `${r.original} → ${r.replaced}`).join(", ")}`,
    );
  }

  // 注意書きの付与
  const finalText = addDisclaimers(replaceResult.cleanedText);

  return {
    cleanedText: finalText,
    warnings,
  };
}

