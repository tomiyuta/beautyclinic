import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("GEMINI_API_KEY is not set. Gemini features will be disabled.");
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// 利用可能なモデル名のリスト（優先順位順 - 最新版を最優先）
// 2025年11月時点で利用可能な最新モデル
const DEFAULT_MODEL_CANDIDATES = [
  "gemini-2.5-pro",                      // Gemini 2.5 Pro（最新・高性能版・2025年5月リリース）
  "gemini-2.5-flash",                    // Gemini 2.5 Flash（最新・高速版・2025年5月リリース）
  "gemini-2.5-flash-preview-05-20",      // Gemini 2.5 Flash Preview（旧プレビュー版）
  "gemini-2.5-pro-preview-05-06",        // Gemini 2.5 Pro Preview（旧プレビュー版）
  "gemini-2.5-pro-preview-03-25",        // Gemini 2.5 Pro Preview（旧版）
  "gemini-2.5-flash-lite-preview-06-17", // Gemini 2.5 Flash-Lite Preview（旧プレビュー版）
];

// 成功したモデル名をキャッシュ（サーバー起動中は保持）
let cachedModelName: string | null = null;

/**
 * 利用可能なGeminiモデルを自動的に選択します
 * 1. 環境変数 GEMINI_MODEL が設定されている場合はそれを使用
 * 2. キャッシュされたモデルがある場合はそれを使用
 * 3. それ以外の場合は候補リストから順に試行して最初に成功したものを使用
 */
async function selectGeminiModel(): Promise<string> {
  // 環境変数で指定されている場合はそれを使用
  const envModel = process.env.GEMINI_MODEL;
  if (envModel) {
    console.log(`Using Gemini model from environment: ${envModel}`);
    return envModel;
  }

  // キャッシュされたモデルがある場合はそれを使用
  if (cachedModelName) {
    return cachedModelName;
  }

  // 候補リストから順に試行
  console.log("Auto-selecting Gemini model from candidates...");
  let lastError: Error | null = null;
  
  for (const modelName of DEFAULT_MODEL_CANDIDATES) {
    try {
      // モデルの存在確認（実際のAPI呼び出しなしで検証）
      // 実際には最初のAPI呼び出し時に検証されるため、ここでは候補をそのまま返す
      // 最初の成功時にキャッシュする
      return modelName;
    } catch (modelError) {
      lastError = modelError instanceof Error ? modelError : new Error(String(modelError));
      continue;
    }
  }

  // フォールバック: 最初の候補を返す（実際のエラーはAPI呼び出し時に発生）
  return DEFAULT_MODEL_CANDIDATES[0]!;
}

export async function callGemini(prompt: string): Promise<string> {
  if (!genAI || !apiKey) {
    throw new Error(
      "Gemini APIキーが設定されていません。APIキー設定画面で設定してください。",
    );
  }

  try {
    // 環境変数で指定されているか確認
    const envModel = process.env.GEMINI_MODEL;
    
    // モデル選択（環境変数 > キャッシュ > 自動選択）
    let modelName = await selectGeminiModel();
    const candidatesToTry = cachedModelName 
      ? [cachedModelName] // キャッシュがある場合はそれだけ試す
      : envModel 
        ? [envModel] // 環境変数がある場合はそれだけ試す
        : DEFAULT_MODEL_CANDIDATES; // それ以外は全候補を試す

    let lastError: Error | null = null;
    
    for (let i = 0; i < candidatesToTry.length; i++) {
      modelName = candidatesToTry[i]!;
      try {
        if (!cachedModelName) {
          console.log(`[${i + 1}/${candidatesToTry.length}] Trying Gemini model: ${modelName}`);
        }
        
        // Google Search統合を試行（利用可能なモデルの場合）
        // Gemini 2.5以降では、Google Search統合は別の方法で実装される可能性があるため、
        // まずは通常のモデル呼び出しを試行
        const model = genAI.getGenerativeModel({ model: modelName });
        const useGoogleSearch = false; // 現在は無効化（将来の実装で有効化可能）
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // 初回成功時にモデル名をキャッシュ
        if (!cachedModelName) {
          cachedModelName = modelName;
          console.log(`✓ Gemini model auto-selected and cached: ${modelName}${useGoogleSearch ? " (with Google Search)" : ""}`);
        }
        
        // 出力の冒頭に使用モデル情報を追加
        const modelInfo = `【使用AIモデル: Gemini ${modelName}】\n\n`;
        return modelInfo + text;
      } catch (modelError) {
        const error = modelError instanceof Error ? modelError : new Error(String(modelError));
        lastError = error;
        
        // エラーの詳細をログに記録
        console.error(`Gemini API error for model ${modelName}:`, {
          message: error.message,
          name: error.name,
          stack: error.stack,
        });
        
        // キャッシュされたモデルが失敗した場合はキャッシュをクリア
        if (cachedModelName === modelName) {
          console.warn(`Cached model ${modelName} failed, clearing cache...`);
          cachedModelName = null;
        }
        
        // 最後のモデルでない限り、次のモデルを試す
        if (i < candidatesToTry.length - 1) {
          const errorMsg = error.message.toLowerCase();
          const is404 = errorMsg.includes("404") || errorMsg.includes("not found") || errorMsg.includes("not_found");
          const is401 = errorMsg.includes("401") || errorMsg.includes("unauthorized") || errorMsg.includes("permission");
          const is403 = errorMsg.includes("403") || errorMsg.includes("forbidden");
          const isNetworkError = errorMsg.includes("fetch") || errorMsg.includes("network") || errorMsg.includes("timeout");
          
          if (is401 || is403) {
            // 認証エラーは全てのモデルで同じ可能性が高いので、即座にエラーを投げる
            throw new Error(
              `Gemini APIキーが無効または権限がありません。APIキー設定画面で正しいキーを設定してください。エラー詳細: ${error.message}`,
            );
          }
          
          if (is404) {
            const errorType = "not available";
            console.warn(`  ✗ Model ${modelName} ${errorType}, trying next...`);
            continue;
          }
          
          if (isNetworkError) {
            // ネットワークエラーの場合も次のモデルを試す
            console.warn(`  ✗ Model ${modelName} network error, trying next...`);
            continue;
          }
          
          console.warn(`  ✗ Model ${modelName} failed, trying next...`);
          continue;
        }
        // 最後のモデルでも失敗した場合
        throw error;
      }
    }

    // エラーメッセージを改善
    if (lastError) {
      const errorMsg = lastError.message.toLowerCase();
      if (errorMsg.includes("fetch") || errorMsg.includes("network")) {
        throw new Error(
          "Gemini APIへの接続に失敗しました。ネットワーク接続を確認してください。APIキーが正しく設定されているか確認してください。",
        );
      }
      if (errorMsg.includes("401") || errorMsg.includes("unauthorized")) {
        throw new Error(
          "Gemini APIキーが無効です。APIキー設定画面で正しいキーを設定してください。",
        );
      }
      if (errorMsg.includes("403") || errorMsg.includes("forbidden")) {
        throw new Error(
          "Gemini APIへのアクセスが拒否されました。APIキーの権限を確認してください。",
        );
      }
      if (errorMsg.includes("404") || errorMsg.includes("not found")) {
        throw new Error(
          `利用可能なGeminiモデルが見つかりません。試行したモデル: ${candidatesToTry.join(", ")}。環境変数GEMINI_MODELで利用可能なモデル名を指定してください。`,
        );
      }
      throw new Error(
        `Gemini APIの呼び出しに失敗しました: ${lastError.message}`,
      );
    }
    
    throw new Error("Gemini API: 利用可能なモデルが見つかりませんでした");
  } catch (error) {
    // 既に形式化されたエラーはそのまま投げる
    if (error instanceof Error && error.message.includes("Gemini API")) {
      throw error;
    }
    
    console.error("Gemini API error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // エラーメッセージを改善
    if (errorMessage.includes("fetch") || errorMessage.includes("network")) {
      throw new Error(
        "Gemini APIへの接続に失敗しました。ネットワーク接続とAPIキーを確認してください。",
      );
    }
    
    throw new Error(
      `Gemini APIエラー: ${errorMessage}`,
    );
  }
}

/**
 * JSON文字列内の不正な文字を修正
 */
function fixJSONString(str: string): string {
  // 文字列内の改行やタブをエスケープ
  let result = '';
  let inString = false;
  let escapeNext = false;
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i]!;
    
    if (escapeNext) {
      result += char;
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      result += char;
      escapeNext = true;
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
      result += char;
      continue;
    }
    
    if (inString) {
      // 文字列内の制御文字や改行をエスケープ
      if (char === '\n') {
        result += '\\n';
      } else if (char === '\r') {
        result += '\\r';
      } else if (char === '\t') {
        result += '\\t';
      } else if (char === '\b') {
        result += '\\b';
      } else if (char === '\f') {
        result += '\\f';
      } else if (char.charCodeAt(0) < 32) {
        // その他の制御文字
        result += `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`;
      } else {
        result += char;
      }
    } else {
      // 文字列外での不正な改行や空白を除去
      if (char === '\n' || char === '\r') {
        // 改行を空白に置換（ただし、カンマや括弧の前後は削除）
        if (i > 0 && i < str.length - 1) {
          const prev = str[i - 1];
          const next = str[i + 1];
          if (prev && (prev === ',' || prev === ':' || prev === '{' || prev === '[' || prev === ' ')) {
            // 前が区切り文字なら削除
            continue;
          } else if (next && (next === ',' || next === '}' || next === ']' || next === ' ')) {
            // 後が区切り文字なら削除
            continue;
          } else {
            result += ' ';
          }
        }
      } else {
        result += char;
      }
    }
  }
  
  return result;
}

/**
 * JSONから末尾の不正なカンマを除去
 */
function removeTrailingCommas(jsonStr: string): string {
  // 末尾のカンマを除去（オブジェクトや配列の最後の要素の後）
  return jsonStr
    .replace(/,(\s*[}\]])/g, '$1') // カンマの後に } または ] が続く場合
    .replace(/,(\s*)$/g, ''); // 行末のカンマ
}

/**
 * JSON文字列をより徹底的に修正
 */
function deepFixJSON(jsonStr: string): string {
  let fixed = jsonStr;
  
  // 複数回の修正を適用（最大5回）
  for (let attempt = 0; attempt < 5; attempt++) {
    const original = fixed;
    
    // 1. 末尾の不正なカンマを除去
    fixed = removeTrailingCommas(fixed);
    
    // 2. 文字列内の改行を確実にエスケープ（複数行の文字列に対応）
    // 文字列を一時的にプレースホルダーに置換
    const stringMap = new Map<string, string>();
    let stringIndex = 0;
    let result = '';
    let inString = false;
    let escapeNext = false;
    let stringStart = -1;
    let currentString = '';
    
    // 文字ごとに処理して、文字列を正確に抽出
    for (let i = 0; i < fixed.length; i++) {
      const char = fixed[i]!;
      
      if (escapeNext) {
        if (inString) {
          currentString += char;
        } else {
          result += char;
        }
        escapeNext = false;
        continue;
      }
      
      if (char === '\\') {
        if (inString) {
          currentString += char;
        } else {
          result += char;
        }
        escapeNext = true;
        continue;
      }
      
      if (char === '"') {
        if (inString) {
          // 文字列終了
          // 文字列内の制御文字をエスケープ（既にエスケープされているものは処理しない）
          let escapedContent = '';
          let escapeNext = false;
          
          for (let j = 0; j < currentString.length; j++) {
            const c = currentString[j]!;
            
            if (escapeNext) {
              escapedContent += '\\' + c;
              escapeNext = false;
              continue;
            }
            
            if (c === '\\') {
              escapeNext = true;
              continue;
            }
            
            // エスケープされていない制御文字のみをエスケープ
            if (c === '\n') {
              escapedContent += '\\n';
            } else if (c === '\r') {
              escapedContent += '\\r';
            } else if (c === '\t') {
              escapedContent += '\\t';
            } else if (c === '\b') {
              escapedContent += '\\b';
            } else if (c === '\f') {
              escapedContent += '\\f';
            } else if (c.charCodeAt(0) < 32) {
              // その他の制御文字（ASCII < 32）
              const code = c.charCodeAt(0);
              escapedContent += `\\u${code.toString(16).padStart(4, '0')}`;
            } else {
              escapedContent += c;
            }
          }
          
          // エスケープが途中で終わっている場合は追加
          if (escapeNext) {
            escapedContent += '\\';
          }
          
          const placeholder = `__STR_${stringIndex}__`;
          const escapedMatch = `"${escapedContent}"`;
          stringMap.set(placeholder, escapedMatch);
          result += placeholder;
          stringIndex++;
          currentString = '';
          inString = false;
        } else {
          // 文字列開始
          inString = true;
          stringStart = i;
          currentString = '';
        }
        continue;
      }
      
      if (inString) {
        currentString += char;
      } else {
        result += char;
      }
    }
    
    // 文字列が閉じられていない場合は、そのまま追加
    if (inString) {
      result += `"${currentString}"`;
    }
    
    fixed = result;
    
    // 3. プレースホルダーのまま文字列外の改行やタブを空白または削除
    // プレースホルダーは文字列なので、文字列外の処理のみを適用
    let processedFixed = '';
    for (let i = 0; i < fixed.length; i++) {
      const char = fixed[i]!;
      
      // プレースホルダーの開始を検出（__STR_で始まる）
      if (fixed.substring(i, i + 6) === '__STR_') {
        // プレースホルダーの終わりを探す（__で終わる）
        let placeholderEnd = i + 6;
        while (placeholderEnd < fixed.length && fixed[placeholderEnd] !== '_') {
          placeholderEnd++;
        }
        // __ の次の __ まで
        if (fixed.substring(placeholderEnd, placeholderEnd + 2) === '__') {
          placeholderEnd += 2;
          // プレースホルダー全体をコピー
          processedFixed += fixed.substring(i, placeholderEnd);
          i = placeholderEnd - 1;
          continue;
        }
      }
      
      // プレースホルダー以外の文字列外での改行やタブを処理
      if (char === '\n' || char === '\r' || char === '\t') {
        // 前後の文字を確認
        if (i > 0 && i < fixed.length - 1) {
          const before = fixed[i - 1];
          const after = fixed[i + 1];
          if ((before === ',' || before === ':' || before === '{' || before === '[' || before === '}') &&
              (after === ',' || after === '}' || after === ']')) {
            // 区切り文字の間は削除
            continue;
          }
        }
        processedFixed += ' '; // それ以外は空白に
      } else {
        processedFixed += char;
      }
    }
    
    fixed = processedFixed;
    
    // 4. 連続する空白を単一の空白に（プレースホルダーを保護しながら）
    // プレースホルダーを一時的に保護
    const placeholderProtection = new Map<string, string>();
    let protectionIndex = 0;
    fixed = fixed.replace(/__STR_\d+__/g, (match) => {
      const protection = `__PROT_${protectionIndex}__`;
      placeholderProtection.set(protection, match);
      protectionIndex++;
      return protection;
    });
    
    // 連続する空白を単一の空白に
    fixed = fixed.replace(/  +/g, ' ');
    
    // プレースホルダーを元に戻す
    placeholderProtection.forEach((original, protection) => {
      fixed = fixed.replace(new RegExp(protection.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), original);
    });
    
    // 5. 文字列を元に戻す（逆順で置換して競合を避ける）
    const sortedPlaceholders = Array.from(stringMap.keys()).sort((a, b) => b.length - a.length);
    sortedPlaceholders.forEach((placeholder) => {
      const escapedString = stringMap.get(placeholder)!;
      fixed = fixed.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), escapedString);
    });
    
    // 6. さらに末尾のカンマを除去（文字列戻し後の再チェック）
    fixed = removeTrailingCommas(fixed);
    
    // 7. パースを試みて成功したら終了
    try {
      JSON.parse(fixed);
      return fixed;
    } catch (parseError) {
      // 最後の試行で、より積極的な修正
      if (attempt === 4) {
        // 末尾のカンマを強制的に除去
        fixed = fixed.replace(/,\s*([}\]])/g, '$1');
        // 再度パースを試みる
        try {
          JSON.parse(fixed);
          return fixed;
        } catch {
          // それでも失敗した場合は、元の文字列を返す
          console.warn("Deep JSON fix failed, returning partially fixed JSON");
          return fixed;
        }
      }
      // 変更がなければ終了
      if (fixed === original) {
        break;
      }
    }
  }
  
  return fixed;
}

/**
 * Gemini APIレスポンスからMarkdownコードブロックを除去してJSONを抽出
 * ```json {...} ``` 形式のレスポンスやMarkdownテキストに埋め込まれたJSONに対応
 */
export function extractJSONFromResponse(response: string): string {
  // Markdownコードブロックを除去
  let cleaned = response.trim();
  
  // ```json または ``` で囲まれている場合
  if (cleaned.startsWith("```")) {
    // 最初の```json または ``` を除去
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "");
    // 最後の```を除去
    cleaned = cleaned.replace(/\s*```$/g, "");
    cleaned = cleaned.trim();
  }
  
  // JSONオブジェクトまたは配列を探す（{...} または [...]）
  // 最初の { または [ から始まるJSONを探す
  let jsonStart = -1;
  let braceDepth = 0;
  let bracketDepth = 0;
  let inString = false;
  let escapeNext = false;
  let lastValidEnd = -1;
  
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i]!;
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    
    if (char === '"' && !escapeNext) {
      inString = !inString;
      continue;
    }
    
    if (!inString) {
      if (char === '{') {
        if (jsonStart === -1) {
          jsonStart = i;
        }
        braceDepth++;
      } else if (char === '}') {
        braceDepth--;
        if (braceDepth === 0 && jsonStart !== -1 && bracketDepth === 0) {
          // JSONオブジェクトが完全に閉じられた候補
          lastValidEnd = i + 1;
          // さらに続きがあるか確認（summaryなど）
          const remaining = cleaned.substring(i + 1).trim();
          // 続きがJSONとして有効か確認（カンマの後にフィールド名など）
          if (remaining.length > 0) {
            // カンマで始まる、または直接フィールド名で始まる場合は続きがある
            if (remaining.match(/^\s*[,:]/) || remaining.match(/^\s*"[^"]+"\s*:/)) {
              // 続きがある場合は、次の閉じ括弧まで続ける
              braceDepth++; // 一時的にdepthを戻す
              continue;
            }
          }
          // 続きがなければここで終了
          let extracted = cleaned.substring(jsonStart, i + 1).trim();
          extracted = fixJSONString(extracted);
          extracted = deepFixJSON(extracted);
          return extracted;
        }
      } else if (char === '[') {
        if (jsonStart === -1) {
          jsonStart = i;
        }
        bracketDepth++;
      } else if (char === ']') {
        bracketDepth--;
        if (bracketDepth === 0 && jsonStart !== -1 && braceDepth > 0) {
          // 配列は閉じられたが、オブジェクトはまだ開いている（正常）
          continue;
        } else if (bracketDepth === 0 && jsonStart !== -1 && braceDepth === 0) {
          // 配列のみのJSON（通常はないが念のため）
          let extracted = cleaned.substring(jsonStart, i + 1).trim();
          extracted = fixJSONString(extracted);
          extracted = deepFixJSON(extracted);
          return extracted;
        }
      }
    }
  }
  
  // 最後までループしても閉じられていない場合、最後に有効だった位置を使用
  if (lastValidEnd > 0 && jsonStart >= 0) {
    let extracted = cleaned.substring(jsonStart, lastValidEnd).trim();
    
    // 閉じ括弧の後に続くテキストを確認
    const afterBrace = cleaned.substring(lastValidEnd).trim();
    // summaryフィールドなどが続いている可能性を確認
    // 複数行やエスケープされた文字に対応
    const summaryMatch = afterBrace.match(/^[,:]?\s*"summary"\s*:\s*"((?:[^"\\]|\\.|\\n|\\r|\\t)*)"\s*\}?\s*$/ims);
    if (summaryMatch) {
      // summaryフィールドが見つかった場合、JSONオブジェクトに追加
      // 最後の } の前を探す
      const lastBraceIndex = extracted.lastIndexOf('}');
      if (lastBraceIndex >= 0) {
        // 最後の閉じ括弧の前にsummaryフィールドを挿入
        const before = extracted.substring(0, lastBraceIndex).trim();
        const needsComma = !before.endsWith(',') && !before.endsWith('{') && !before.endsWith('[');
        // summary文字列をエスケープ（fixJSONString関数を使用）
        // 一時的に文字列として処理
        const tempSummary = `"${summaryMatch[1]}"`;
        const fixedSummary = fixJSONString(tempSummary);
        // 外側の引用符を除去して値のみを取得
        const summaryValue = fixedSummary.slice(1, -1);
        extracted = before + (needsComma ? ',' : '') + ` "summary": "${summaryValue}" }`;
      }
    }
    
    extracted = fixJSONString(extracted);
    extracted = deepFixJSON(extracted);
    return extracted;
  }
  
  // 閉じ括弧が見つからない場合は、braceDepth/bracketDepthを考慮して補完
  if (jsonStart >= 0) {
    let extracted = cleaned.substring(jsonStart).trim();
    
    // 末尾にsummaryフィールドなどが続いている可能性を確認
    // ただし、これはJSONオブジェクトの外にある可能性が高いので、
    // まずは不足している閉じ括弧を追加
    for (let i = 0; i < braceDepth; i++) {
      extracted += '}';
    }
    for (let i = 0; i < bracketDepth; i++) {
      extracted += ']';
    }
    
    extracted = fixJSONString(extracted);
    extracted = deepFixJSON(extracted);
    return extracted;
  }
  
  // 単純な正規表現での抽出（フォールバック）
  const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) {
    let extracted = jsonMatch[1]!.trim();
    // JSON文字列を修正
    extracted = fixJSONString(extracted);
    extracted = deepFixJSON(extracted);
    return extracted;
  }
  
  // JSONが見つからない場合は元の文字列を返す（エラーは呼び出し側で処理）
  return cleaned;
}

export async function researchTrendAnalysis(location: string): Promise<string> {
  // 現在の日付を取得（最新情報を取得するため）
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // 0-11なので+1
  const currentDateStr = `${currentYear}年${currentMonth}月`;

  // Web検索を実行して最新情報を取得（SerpAPI必須）
  const { performWebSearchWithSerpAPIOnly, formatSearchResults, generateTrendSearchQuery } = await import("./web-search");
  const searchQuery = generateTrendSearchQuery(location, currentYear, currentMonth);
  console.log(`[Trend Analysis] Web検索実行: ${searchQuery}`);
  const searchResults = await performWebSearchWithSerpAPIOnly(searchQuery, 10);
  const webSearchResults = formatSearchResults(searchResults);
  console.log(`[Trend Analysis] Web検索結果: ${searchResults.length}件取得`);

  const defaultPrompt = `あなたは美容皮膚科クリニックの市場調査専門家です。
${location}で現在流行している美容施術・治療について調査してください。

【重要】以下のWeb検索結果を基に、最新の情報を分析してください。
現在の日付は${currentDateStr}です。${currentYear}年${currentMonth}月時点の最新情報を優先的に使用してください。

${webSearchResults}

【分析指示】
以下の観点から、上記のWeb検索結果を基に分析してください：
1. 人気の高い施術（ダーマペン、ボツリヌス注射、ヒアルロン酸注入など）
2. 各施術の平均価格帯
3. 新しく注目されている施術や技術
4. 顧客ニーズの傾向

【重要】
- Web検索結果に含まれる最新の情報を優先的に使用してください
- 2024年以前の古い情報は使用しないでください
- 情報の出典（URL）を可能な限り明記してください
- 調査結果のタイトルや冒頭には「${currentDateStr}時点のWeb情報に基づき実施」と記載してください

わかりやすく読みやすい形式で調査結果をまとめてください。最後に、トレンド分析の総括を記載してください。`;

  const { getPrompt, replacePlaceholders } = await import("./prompt-helper");
  const template = await getPrompt("gemini_research_trend_analysis", defaultPrompt);
  const prompt = replacePlaceholders(template, { 
    location,
    currentDate: currentDateStr,
    currentYear: currentYear.toString(),
    currentMonth: currentMonth.toString()
  });
  
  return callGemini(prompt);
}

export async function researchPriceComparison(
  treatments: string[],
  cities: string[],
): Promise<string> {
  // 現在の日付を取得（最新情報を取得するため）
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // 0-11なので+1
  const currentDateStr = `${currentYear}年${currentMonth}月`;

  // Web検索を実行して最新情報を取得
  // 複数の商品がある場合は、各商品ごとに検索を実行して結果を統合
  // Web検索を実行して最新情報を取得（SerpAPI必須）
  const { performWebSearchWithSerpAPIOnly, formatSearchResults, generatePriceSearchQuery } = await import("./web-search");
  
  console.log(`[Price Comparison] 入力パラメータ - 施術数: ${treatments.length}, 都市数: ${cities.length}`);
  console.log(`[Price Comparison] 施術: ${treatments.join(", ")}`);
  console.log(`[Price Comparison] 都市: ${cities.join(", ")}`);
  
  // 複数の商品がある場合は、各商品ごとに検索を実行
  const allSearchResults: Array<{ title: string; link: string; snippet: string; date?: string }> = [];
  
  if (treatments.length > 1) {
    // 複数の商品がある場合、各商品ごとに検索を実行
    console.log(`[Price Comparison] 複数商品検出（${treatments.length}件）。各商品ごとに検索を実行します。`);
    
    for (const treatment of treatments) {
      const searchQuery = generatePriceSearchQuery([treatment], cities, currentYear, currentMonth);
      console.log(`[Price Comparison] 商品「${treatment}」のWeb検索実行: ${searchQuery}`);
      const searchResults = await performWebSearchWithSerpAPIOnly(searchQuery, 10);
      console.log(`[Price Comparison] 商品「${treatment}」のWeb検索結果: ${searchResults.length}件取得`);
      
      // 検索結果に商品名を追加して識別しやすくする
      const enrichedResults = searchResults.map(result => ({
        ...result,
        snippet: `[商品: ${treatment}] ${result.snippet}`,
      }));
      
      allSearchResults.push(...enrichedResults);
      
      // 検索間隔を設ける（APIレート制限対策）
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // 重複を除去（URLベース）
    const uniqueResults = Array.from(
      new Map(allSearchResults.map(result => [result.link, result])).values()
    );
    
    var webSearchResults = formatSearchResults(uniqueResults);
    console.log(`[Price Comparison] 統合されたWeb検索結果: ${uniqueResults.length}件（重複除去後）`);
  } else {
    // 単一商品の場合は従来通り1回の検索
    const searchQuery = generatePriceSearchQuery(treatments, cities, currentYear, currentMonth);
    console.log(`[Price Comparison] Web検索実行: ${searchQuery}`);
    const searchResults = await performWebSearchWithSerpAPIOnly(searchQuery, 10);
    var webSearchResults = formatSearchResults(searchResults);
    console.log(`[Price Comparison] Web検索結果: ${searchResults.length}件取得`);
  }

  const defaultPrompt = `あなたは美容皮膚科クリニックの価格調査専門家です。
以下の都市の美容クリニックでの施術価格を調査してください：

都市: ${cities.join(", ")}
施術: ${treatments.join(", ")}

【重要】以下のWeb検索結果を基に、最新の価格情報を分析してください。
現在の日付は${currentDateStr}です。${currentYear}年${currentMonth}月時点の最新情報を優先的に使用してください。

${webSearchResults}

【分析指示】
各都市・各施術について、上記のWeb検索結果を基に以下の情報を含めてわかりやすくまとめてください：

- 都市名
- 施術名
- 平均価格（数値）
- 価格帯の説明
- 調査件数（推定）
- 情報の出典（URL）

【重要】
- Web検索結果に含まれる最新の価格情報を優先的に使用してください
- 2024年以前の古い情報は使用しないでください
- 情報の出典（URL）を可能な限り明記してください
- 調査結果のタイトルや冒頭には「${currentDateStr}時点のWeb情報に基づき実施」と記載してください
- 複数の施術が指定されている場合、各施術について個別に価格情報を調査・記載してください
- Web検索結果に「[商品: 施術名]」というタグが含まれている場合は、そのタグを参考にして各施術の価格情報を抽出してください

最後に、価格比較の総括を記載してください。`;

  const { getPrompt, replacePlaceholders } = await import("./prompt-helper");
  const template = await getPrompt("gemini_research_price_comparison", defaultPrompt);
  const prompt = replacePlaceholders(template, { 
    cities: cities.join(", "),
    treatments: treatments.join(", "),
    currentDate: currentDateStr,
    currentYear: currentYear.toString(),
    currentMonth: currentMonth.toString()
  });
  
  console.log(`[Price Comparison] プロンプト長: ${prompt.length}文字`);
  console.log(`[Price Comparison] Web検索結果の長さ: ${webSearchResults.length}文字`);
  console.log(`[Price Comparison] 施術数: ${treatments.length}, 都市数: ${cities.length}`);
  
  const result = await callGemini(prompt);
  console.log(`[Price Comparison] AI応答の長さ: ${result.length}文字`);
  
  return result;
}

export async function analyzeInstagramTrends(
  keywords: string[],
  timeRange: "last_week" | "last_month" | "last_3months" = "last_month",
  location: string = "unknown",
): Promise<string> {
  // 現在の日付を取得（最新情報を取得するため）
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const currentDateStr = `${currentYear}年${currentMonth}月`;
  const iso8601Date = currentDate.toISOString();

  const timeRangeText = {
    last_week: "過去1週間",
    last_month: "過去1ヶ月",
    last_3months: "過去3ヶ月",
  }[timeRange];

  // Web検索を実行して最新情報を取得（SerpAPI必須）
  const { performWebSearchWithSerpAPIOnly, formatSearchResults, generateInstagramTrendSearchQuery } = await import("./web-search");
  const searchQuery = generateInstagramTrendSearchQuery(keywords, currentYear, currentMonth);
  console.log(`[Instagram Trends] Web検索実行: ${searchQuery}`);
  const searchResults = await performWebSearchWithSerpAPIOnly(searchQuery, 10);
  const webSearchResults = formatSearchResults(searchResults);
  console.log(`[Instagram Trends] Web検索結果: ${searchResults.length}件取得`);

  const defaultPrompt = `<SYS>

あなたはInstagram上の「美容施術トレンド」を調査するリサーチ専門家です（アカウント運用の助言は出さない）。

出力は「2部構成・日本語・順番厳守」。次のタグで区切って返してください：



1) <CONSENSUS_JSON> … AI合議・採点用の"隠しJSON"（機械処理用）。UIには表示しない。

2) <REPORT_MARKDOWN> … 人が読む研究レポート（Markdown）。運用Tips（投稿時間/推奨形式等）は含めない。



厳格ルール：

- 対象は ${timeRangeText} の**公開**投稿/プロフィールのみ。非公開情報や規約違反取得は行わない。

- 全ての主張・数値は根拠URL（投稿/プロフィール/ハッシュタグ等）と取得日時で裏付け。根拠がなければ "unknown"。

- 医療広告/景表法に配慮し、誇大・断定・比較優良誤認（「必ず/完全/No.1/絶対」等）やビフォーアフター断定は避ける。

- JSONは厳密構造。説明・解釈は <REPORT_MARKDOWN> 側のみ（運用助言は記載しない）。

</SYS>



<DEV>

【目的】

${keywords.join(", ")} に関連する**美容施術のトレンド**（施術名/悩み語/価格言及/安全性の話題/誤情報兆候/ライフサイクル）を、

公開指標と根拠URL付きで客観可視化する。**運用ノウハウは出さない**。



【指標・定義（研究用）】

- er_per_plays_pct = (likes + comments) / plays * 100（%）。Reels等でplaysが可視のとき。

- er_per_followers_pct = (likes + comments) / followers * 100（%）。アカウント基準の近似。

- growth_rate_pct：期間前半→後半の出現量の単純比（推定可、推定時は methodology.notes に明記）。

- content_type ∈ {reel, carousel, photo, story}（storyは取得不可の場合 "unknown"）。

- lifecycle ∈ {emerging, peaking, maturing, declining}（増勢/半減期/話題遷移で判定）。

- misinformation_patterns：誤情報リスク（即効断定/禁忌無視/加工による誤認 等）。

- safety_topics：安全性・禁忌・ダウンタイムへの言及有無。



【バイアス管理】

- 懸賞/アフィ/広告/リポストは risk_flags に明記し、数値解釈を慎重に。

- 若年層/プラットフォーム偏り、一過性バズは「限界」として gaps に記録。



【出力1：合議用JSON（厳密スキーマ・順序厳守）】

<CONSENSUS_JSON>

{

  "meta": {

    "keywords": ${JSON.stringify(keywords)},               // 例: ["ダーマペン","ピコレーザー","ヒアルロン酸"]

    "timeRange": "${timeRangeText}",            // 例: "last 30 days"

    "location": "${location}",                  // 例: "Japan"（未指定なら "unknown"）

    "generatedAt": "${iso8601Date}"

  },

  "methodology": {

    "query_plan": [

      "日本語/英語/同義語/機器名/薬剤名/俗称で検索（microneedling, dermapen4, pico laser, HIFU, botox, HA 等）",

      "ハッシュタグ/キーワードから投稿・プロフィールを横断、関連→派生テーマを追跡",

      "広告/懸賞/明確なプロモはバイアス注記"

    ],

    "definitions": {

      "er_per_plays_pct": "(likes + comments)/plays * 100",

      "er_per_followers_pct": "(likes + comments)/followers * 100",

      "content_types": ["reel","carousel","photo","story"],

      "lifecycle": ["emerging","peaking","maturing","declining"]

    },

    "bias_controls": {

      "giveaway_flag": true,

      "affiliate_flag": true,

      "clickbait_flag": true,

      "before_after_caution": true,

      "medical_claims_caution": true

    },

    "notes": "公開情報のみ使用。impressions等の非公開メトリクスは扱わない。"

  },



  "treatments": [

    {

      "name": "string",                           // 例: ダーマペン

      "aliases": ["string"],                      // 同義語・機器名・薬剤名

      "concerns": ["string"],                     // 共起する悩み語（毛穴/赤み/小顔 等）

      "signals": {

        "volume_est": number | "unknown",         // 期間中の関連投稿推定数

        "growth_rate_pct": number | "unknown",

        "median_er_per_plays_pct": number | "unknown",

        "median_er_per_followers_pct": number | "unknown"

      },

      "content_mix_pct": { "reel": number | "unknown", "carousel": number | "unknown", "photo": number | "unknown", "story": number | "unknown" },

      "lifecycle": "emerging|peaking|maturing|declining",

      "price_mentions": {

        "examples": ["¥18000 など"],             // キャプション/コメントから抽出できたら

        "range_jpy": { "p25": number | "unknown", "median": number | "unknown", "p75": number | "unknown" }

      },

      "safety_topics": ["ダウンタイム","内出血","禁忌","麻酔"],

      "misinformation_patterns": ["string"],

      "representative_posts": [

        { "url": "https://www.instagram.com/p/...", "content_type": "reel|carousel|photo", "er_per_plays_pct": number | "unknown", "fetchedAt": "${iso8601Date}" }

      ],

      "evidence": [

        { "url": "https://www.instagram.com/...", "caption_snippet": "string", "fetchedAt": "${iso8601Date}" }

      ]

    }

  ],



  "hashtags": [

    {

      "tag": "string",

      "volume_est": number | "unknown",

      "growth_rate_pct": number | "unknown",

      "median_er_per_plays_pct": number | "unknown",

      "co_tags": ["string"],

      "linked_treatments": ["string"],

      "risk_flags": ["before_after","medical_claims","giveaway","affiliate"],

      "evidence": [{ "url": "https://www.instagram.com/explore/tags/...", "fetchedAt": "${iso8601Date}" }]

    }

  ],



  "creators": [

    {

      "handle": "@string",

      "display_name": "string",

      "category": "clinic|doctor|influencer|device_brand|media",

      "followers": number | "unknown",

      "median_er_per_followers_pct": number | "unknown",

      "post_freq_per_week": number | "unknown",

      "top_content_types": ["reel","carousel"],   // 上位2つ

      "representative_posts": [

        { "url": "https://www.instagram.com/p/...", "content_type": "reel|carousel|photo", "fetchedAt": "${iso8601Date}" }

      ],

      "notes": "string"

    }

  ],



  "top_posts": [

    {

      "url": "https://www.instagram.com/p/...",

      "author_handle": "@string",

      "author_category": "clinic|doctor|influencer|device_brand|media",

      "postedAt": "${iso8601Date}",

      "content_type": "reel|carousel|photo|story",

      "likes": number | "unknown",

      "comments": number | "unknown",

      "plays": number | "unknown",               // リール等で可視のとき

      "er_per_plays_pct": number | "unknown",

      "text_keywords": ["string"],

      "has_before_after_flag": boolean | "unknown",

      "risk_flags": ["medical_claims","before_after","giveaway","affiliate","clickbait"],

      "fetchedAt": "${iso8601Date}"

    }

  ],



  "visual_observations": {

    "palette_keywords": ["pastel","skin-tone","high-contrast","white-background" ],

    "layout_styles": ["before-after_split","text-overlay_bold","doctor_face_closeup" ],

    "notes": "研究所見（運用示唆は記さない）"

  },



  "audience_signals": [

    { "theme": "ダウンタイム・赤み", "example_comments": ["何日休めば？","当日はメイク可能？"] },

    { "theme": "価格・初回・モニター", "example_comments": ["初回いくら？","学割ありますか？"] },

    { "theme": "安全性・痛み", "example_comments": ["神経/血管リスク？","麻酔は？"] }

  ],



  "biasNotes": "懸賞/ギフティング/広告投稿でERが歪む可能性。一過性バズに注意。",

  "sources": [{ "profile_or_domain": "https://www.instagram.com/...", "count": number }],

  "gaps": ["storyは網羅取得が困難", "plays非表示の投稿ではer_per_plays_pctがunknown など"]

}

</CONSENSUS_JSON>



【出力2：人向けMarkdown（研究レポート。運用Tipsは含めない）】

<REPORT_MARKDOWN>

## 概要

- 対象キーワード：${keywords.join(", ")} / 期間：${timeRangeText}（${location}）

- 観測要点（3点）：施術 × 悩み語 × ライフサイクルの所見（簡潔に）



### 1. 施術トレンドの全体像

- 投稿量・増勢・ER中央値から見た上位施術（要約）

- ライフサイクル分布（emerging / peaking / maturing / declining）



### 2. 施術別の詳細（上位）

| 施術 | 共起する悩み語 | 投稿量(推定) | 増加率 | ER中央値(plays比,%) | ライフサイクル | 価格言及(中央値) |

|---|---|---:|---:|---:|---|---:|

| 例 | 毛穴, 赤み | 1.2k | +18% | 3.1 | peaking | ¥18,000 |



### 3. ハッシュタグの関連構造（研究所見）

- 上位タグと共起タグの束（施術との関連性を簡潔に）



### 4. 主要アカウント（研究所見）

- 代表的なクリニック/医師/インフルエンサー/機器メーカー（フォロワー規模・ERの中央値を添える）



### 5. 視覚モチーフ（研究所見）

- 配色・レイアウト・演出（before/afterの断定回避、加工による誤認の注意）



### 6. 価格言及（参考）

- キャプション/コメントからの価格レンジ抽出（存在する場合のみ）と信頼性の注記



### 7. 安全性・誤情報

- よく触れられる安全性トピック（ダウンタイム/禁忌 等）

- 誤情報パターン（即効断定/禁忌無視/加工による誤認）の観測例



### 8. 方法・限界

- データ取得・正規化・ライフサイクル判定の方法

- サンプリング偏り・一過性要因などの限界



### 9. 代表URL

- 投稿/プロフィール/タグの代表的なURLを列挙



### 総括

- 本期間の**施術トレンドの核心**（需要の横断所見）を1段落でまとめる

</REPORT_MARKDOWN>

</DEV>



<USER>

- キーワード: ${keywords.join(", ")}        // 例: ["ダーマペン","ピコレーザー","ヒアルロン酸"]

- 期間: ${timeRangeText}          // 例: "last 30 days"

- 地域(任意): ${location}        // 例: "Japan"（未指定なら "unknown"）

</USER>



【重要】以下のWeb検索結果を基に、最新のInstagramトレンドを分析してください。
現在の日付は${currentDateStr}です。${currentYear}年${currentMonth}月時点の最新情報を優先的に使用してください。

${webSearchResults}`;

  const { getPrompt, replacePlaceholders } = await import("./prompt-helper");
  const template = await getPrompt("gemini_analyze_instagram_trends", defaultPrompt);
  const prompt = replacePlaceholders(template, { 
    keywords: keywords.join(", "),
    keywords_json: JSON.stringify(keywords),
    timeRange: timeRangeText,
    location: location || "unknown",
    generatedAt: iso8601Date,
  });
  
  return callGemini(prompt);
}

export async function analyzeTikTokTrends(
  keywords: string[],
  timeRange: "last_week" | "last_month" | "last_3months" = "last_month",
  location: string = "unknown",
): Promise<string> {
  // 現在の日付を取得（最新情報を取得するため）
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const currentDateStr = `${currentYear}年${currentMonth}月`;
  const iso8601Date = currentDate.toISOString();

  const timeRangeText = {
    last_week: "過去1週間",
    last_month: "過去1ヶ月",
    last_3months: "過去3ヶ月",
  }[timeRange];

  // Web検索を実行して最新情報を取得（SerpAPI必須）
  const { performWebSearchWithSerpAPIOnly, formatSearchResults, generateTikTokTrendSearchQuery } = await import("./web-search");
  const searchQuery = generateTikTokTrendSearchQuery(keywords, currentYear, currentMonth);
  console.log(`[TikTok Trends] Web検索実行: ${searchQuery}`);
  const searchResults = await performWebSearchWithSerpAPIOnly(searchQuery, 10);
  const webSearchResults = formatSearchResults(searchResults);
  console.log(`[TikTok Trends] Web検索結果: ${searchResults.length}件取得`);

  const defaultPrompt = `<SYS>

あなたはTikTok上の美容施術トレンドを調査するリサーチ専門家です（アカウント運用の助言は出さない）。

出力は「2部構成・日本語・順番厳守」。次のタグで区切って返してください：



1) <CONSENSUS_JSON> … AI合議・採点用の"隠しJSON"（機械処理用）。UIには表示しない。

2) <REPORT_MARKDOWN> … 人が読む研究レポート（Markdown）。運用Tipsや投稿助言は含めない。



厳格ルール：

- 対象は ${timeRangeText} の**公開**投稿/プロフィール/サウンドのみ。非公開データや規約違反の取得はしない。

- すべての主張・数値は根拠URL（動画/プロフィール/サウンド等）と取得日時で裏付け。根拠がなければ "unknown"。

- 医療広告/景表法に配慮し、誇大・断定・比較優良誤認（「必ず/完全/No.1/絶対」等）やビフォーアフターの断定は避ける。

- JSONは厳密構造。説明・編集・解釈は <REPORT_MARKDOWN> 側のみで行う（運用に直結する指示は記載しない）。

</SYS>



<DEV>

【目的】

${keywords.join(", ")} に関連する**美容施術のトレンド**（施術名・悩み語・価格言及・安全性の話題・誤情報の兆候・ライフサイクル）を、

客観指標と根拠URLつきで可視化する。**運用ノウハウや投稿手法は出さない**。



【指標・定義（研究用）】

- er_pct = (likes + comments + shares) / views * 100（%）。views=0/不明は "unknown"。

- view_velocity_per_day = 期間内増分 / 経過日数（推定可。推定時は methodology.notes に記載）。

- format ∈ {short(<20s), mid(20–60s), long(>60s)} は**研究分類**としてのみ使用（運用示唆を出さない）。

- lifecycle ∈ {emerging, peaking, maturing, declining} を、増勢・半減期・話題移行で判定。

- misinformation_patterns：誤情報リスク（例：即効断定/禁忌無視/加工による誤認 等）。

- safety_topics：安全性・副反応・禁忌に触れるコメント/説明の有無。



【バイアス管理】

- 懸賞・アフィ・広告・リポスト・クリックベイトは risk_flags に明記し、数値解釈を慎重に。

- 若年ユーザー偏重や一過性バズの影響は「限界」として gaps に記録。



【出力1：合議用JSON（厳密スキーマ・順序厳守）】

<CONSENSUS_JSON>

{

  "meta": {

    "keywords": ${JSON.stringify(keywords)},              // 例: ["ダーマペン","ピコレーザー","ヒアルロン酸"]

    "timeRange": "${timeRangeText}",           // 例: "last 30 days"

    "location": "${location}",                 // 例: "Japan"（未指定なら "unknown"）

    "generatedAt": "${iso8601Date}"

  },

  "methodology": {

    "query_plan": [

      "日本語/英語/同義語/機器名/薬剤名/俗称で検索（例: microneedling, dermapen4, pico laser, HIFU, botox, HA など）",

      "ハッシュタグ/キーワード/サウンド/エフェクトを横断し、関連動画→派生テーマを追跡",

      "広告/懸賞/リポスト/ブランド案件をバイアス注記"

    ],

    "definitions": {

      "er_pct": "(likes + comments + shares)/views * 100",

      "view_velocity_per_day": "期間内増分/経過日数（推定可）",

      "format_bins": { "short":"<20s", "mid":"20-60s", "long":">60s" },

      "lifecycle": ["emerging","peaking","maturing","declining"]

    },

    "bias_controls": {

      "giveaway_flag": true,

      "affiliate_flag": true,

      "clickbait_flag": true,

      "before_after_caution": true,

      "medical_claims_caution": true

    },

    "notes": "公開情報のみ使用。完視聴率など非公開メトリクスは扱わない。"

  },



  "treatments": [

    {

      "name": "string",                          // 施術名（例: ダーマペン）

      "aliases": ["string"],                     // 同義語・機器名・薬剤名

      "concerns": ["string"],                    // 共起する悩み語（例: 毛穴, 赤み, 色素沈着）

      "signals": {

        "volume_est": number | "unknown",        // 期間中の関連投稿推定数

        "growth_rate_pct": number | "unknown",

        "median_er_pct": number | "unknown",

        "view_velocity_per_day": number | "unknown"

      },

      "format_mix_pct": { "short": number | "unknown", "mid": number | "unknown", "long": number | "unknown" },

      "lifecycle": "emerging|peaking|maturing|declining",

      "price_mentions": {

        "examples": ["¥18000 など"],            // キャプション/コメントから抽出できたら

        "range_jpy": { "p25": number | "unknown", "median": number | "unknown", "p75": number | "unknown" }

      },

      "safety_topics": ["ダウンタイム","内出血","禁忌","麻酔"],  // 触れられていれば列挙

      "misinformation_patterns": ["string"],     // 誤情報リスクのパターン

      "representative_posts": [

        { "url": "https://www.tiktok.com/@.../video/...", "format": "short|mid|long", "er_pct": number | "unknown", "fetchedAt": "${iso8601Date}" }

      ],

      "evidence": [

        { "url": "https://www.tiktok.com/...", "caption_snippet": "string", "fetchedAt": "${iso8601Date}" }

      ]

    }

  ],



  "hashtags": [

    { "tag": "string", "volume_est": number | "unknown", "growth_rate_pct": number | "unknown", "co_tags": ["string"],

      "linked_treatments": ["string"], "median_er_pct": number | "unknown",

      "risk_flags": ["before_after","medical_claims","giveaway","affiliate"],

      "evidence":[{ "url":"https://www.tiktok.com/...", "fetchedAt":"${iso8601Date}" }] }

  ],



  "sounds": [

    { "title":"string", "url":"https://www.tiktok.com/music/...", "usage_volume_est": number | "unknown",

      "growth_rate_pct": number | "unknown", "associated_treatments": ["string"], 

      "notes":"研究上の関連付け（運用示唆は出さない）",

      "evidence":[{ "url":"https://www.tiktok.com/@.../video/...", "fetchedAt":"${iso8601Date}" }] }

  ],



  "effects_filters": [

    { "name":"string", "url":"https://www.tiktok.com/effect|sticker/...", "usage_volume_est": number | "unknown",

      "style_notes":"美容文脈での使われ方（研究所見）", "risk_flags":["beauty_filter_overuse"],

      "evidence":[{ "url":"https://www.tiktok.com/@.../video/...", "fetchedAt":"${iso8601Date}" }] }

  ],



  "audience_signals": [

    { "theme": "ダウンタイム・赤み", "example_comments": ["何日休めば？","当日はメイク可能？"] },

    { "theme": "価格・初回・モニター", "example_comments": ["初回いくら？","学割ありますか？"] },

    { "theme": "安全性・痛み", "example_comments": ["神経/血管リスク？","麻酔は？"] }

  ],



  "biasNotes": "懸賞/アフィ/広告投稿でERが歪む可能性。一過性バズはライフサイクル判定に注意。",

  "sources": [{ "profile_or_domain": "https://www.tiktok.com/...", "count": number }],

  "gaps": ["若年層偏重の可能性", "views非表示によりer_pctがunknownの投稿あり"]

}

</CONSENSUS_JSON>



【出力2：人向けMarkdown（研究レポート。運用Tipsは含めない）】

<REPORT_MARKDOWN>

## 概要

- 対象キーワード：${keywords.join(", ")} / 期間：${timeRangeText}（${location}）

- 観測要点（3点）：施術 × 悩み語 × ライフサイクルの所見（簡潔に）



### 1. 施術トレンドの全体像

- トップ施術（投稿量・増勢・ER中央値を総合評価）

- ライフサイクル分布：emerging / peaking / maturing / declining の概況



### 2. 施術別の詳細（上位）

| 施術 | 共起する悩み語 | 投稿量(推定) | 増加率 | ER中央値(%) | ライフサイクル | 価格言及(中央値) |

|---|---|---|---:|---:|---|---:|

| 例 | 毛穴, 赤み | 1.2k | +18% | 3.1 | peaking | ¥18,000 |



### 3. 安全性・誤情報の観点

- よく言及される安全性トピック（ダウンタイム/内出血/禁忌/麻酔 等）

- 誤情報パターンの観測（断定表現/加工による誤認/禁忌無視 等）と注意喚起



### 4. ハッシュタグ・サウンド・エフェクト（研究所見）

- 施術ごとに関連性が高いタグ/サウンド/エフェクトの**関連性**のみ（運用示唆は記さない）



### 5. 価格言及（参考）

- コメント/キャプションからの価格レンジ抽出（存在する場合のみ）

- データ欠損・信頼性の注記



### 6. 方法・限界

- データ取得・正規化・ライフサイクル判定の方法

- サンプリング・若年層偏重・一過性バズ等の限界



### 7. 参考URL（代表）

- 代表的な投稿/プロフィール/サウンドのURLを列挙



### 総括

- 本期間における**施術トレンドの核心**（需要の横断所見）を1段落でまとめる

</REPORT_MARKDOWN>

</DEV>



<USER>

- キーワード: ${keywords.join(", ")}        // 例: ["ダーマペン","ピコレーザー","ヒアルロン酸"]

- 期間: ${timeRangeText}          // 例: "last 30 days"

- 地域(任意): ${location}        // 例: "Japan"（未指定なら "unknown"）

</USER>



【重要】以下のWeb検索結果を基に、最新のTikTokトレンドを分析してください。
現在の日付は${currentDateStr}です。${currentYear}年${currentMonth}月時点の最新情報を優先的に使用してください。

${webSearchResults}`;

  const { getPrompt, replacePlaceholders } = await import("./prompt-helper");
  const template = await getPrompt("gemini_analyze_tiktok_trends", defaultPrompt);
  const prompt = replacePlaceholders(template, { 
    keywords: keywords.join(", "),
    keywords_json: JSON.stringify(keywords),
    timeRange: timeRangeText,
    location: location || "unknown",
    generatedAt: iso8601Date,
  });
  
  return callGemini(prompt);
}

export async function analyzeYouTubeTrends(
  keywords: string[],
  timeRange: "last_week" | "last_month" | "last_3months" = "last_month",
  location: string = "unknown",
): Promise<string> {
  // 現在の日付を取得（最新情報を取得するため）
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const currentDateStr = `${currentYear}年${currentMonth}月`;
  const iso8601Date = currentDate.toISOString();

  const timeRangeText = {
    last_week: "過去1週間",
    last_month: "過去1ヶ月",
    last_3months: "過去3ヶ月",
  }[timeRange];

  // Web検索を実行して最新情報を取得（SerpAPI必須）
  const { performWebSearchWithSerpAPIOnly, formatSearchResults, generateYouTubeTrendSearchQuery } = await import("./web-search");
  const searchQuery = generateYouTubeTrendSearchQuery(keywords, currentYear, currentMonth);
  console.log(`[YouTube Trends] Web検索実行: ${searchQuery}`);
  const searchResults = await performWebSearchWithSerpAPIOnly(searchQuery, 10);
  const webSearchResults = formatSearchResults(searchResults);
  console.log(`[YouTube Trends] Web検索結果: ${searchResults.length}件取得`);

  const defaultPrompt = `<SYS>

あなたはYouTube上の美容施術トレンドを調査するリサーチ専門家です（チャンネル運用の助言は出さない）。

出力は「2部構成・日本語・順番厳守」。次のタグで区切って返してください：



1) <CONSENSUS_JSON> … AI合議・採点用の"隠しJSON"（機械処理用）。UIには表示しない。

2) <REPORT_MARKDOWN> … 人が読む研究レポート（Markdown）。運用Tips（投稿時間/推奨形式等）は含めない。



厳格ルール：

- 対象は ${timeRangeText} の**公開**動画/チャンネルのみ。非公開や規約違反取得は行わない。

- すべての主張・数値は、動画/チャンネル等の**根拠URLと取得日時**で裏付け。根拠がなければ "unknown"。

- 医療広告/景表法に配慮し、誇大・断定・比較優良誤認（「必ず/完全/No.1/絶対」等）やビフォーアフター断定は避ける。

- JSONは厳密構造。説明・解釈は <REPORT_MARKDOWN> 側のみ（運用助言は記載しない）。

</SYS>



<DEV>

【目的】

${keywords.join(", ")} に関連する**美容施術のトレンド**（施術名/悩み語/価格言及/安全性の話題/誤情報兆候/ライフサイクル）を、

公開指標と根拠URLつきで客観可視化する。**運用ノウハウは出さない**。



【指標・定義（研究用）】

- engagement_rate_pct = (likes + comments) / views * 100（%）。views=0/不明は "unknown"。

- view_velocity_per_day = 期間内の増加再生 ≒ 直近views増分 / 経過日数（推定可。推定時は methodology.notes に記載）。

- format ∈ {short(≤60s), long(>60s), live} は**研究分類**としてのみ使用（運用示唆は出さない）。

- length_bins: <60s / 1–3m / 3–8m / 8–20m / >20m（m=分）

- lifecycle ∈ {emerging, peaking, maturing, declining}（増勢/半減期/話題遷移で判定）

- misinformation_patterns：誤情報リスク（即効断定/禁忌無視/過度の比較/加工による誤認 等）

- safety_topics：安全性・禁忌・ダウンタイムへの言及有無



【バイアス管理】

- 懸賞/アフィ/クリックベイト/広告強めは risk_flags に明記し、数値解釈を慎重に。

- 一過性バズ/アルゴリズム変動は「限界」として gaps に記録。



【出力1：合議用JSON（厳密スキーマ・順序厳守）】

<CONSENSUS_JSON>

{

  "meta": {

    "keywords": ${JSON.stringify(keywords)},                 // 例: ["ダーマペン","ピコレーザー","ヒアルロン酸"]

    "timeRange": "${timeRangeText}",              // 例: "last 30 days"

    "location": "${location}",                    // 例: "Japan"（未指定なら "unknown"）

    "generatedAt": "${iso8601Date}"

  },

  "methodology": {

    "query_plan": [

      "日本語/英語/同義語/機器名/薬剤名（microneedling, dermapen4, pico laser, HIFU, botox, hyaluronic acid 等）で検索",

      "公開動画のタイトル/説明/チャプター/タグから語を抽出し、関連動画→派生テーマを追跡",

      "広告/懸賞/明確なプロモはバイアス注記"

    ],

    "definitions": {

      "engagement_rate_pct": "(likes + comments)/views * 100",

      "view_velocity_per_day": "期間内増分/経過日数（推定可）",

      "format": ["short","long","live"],

      "length_bins": ["<60s","1-3m","3-8m","8-20m",">20m"],

      "lifecycle": ["emerging","peaking","maturing","declining"]

    },

    "bias_controls": {

      "giveaway_flag": true,

      "affiliate_flag": true,

      "clickbait_flag": true,

      "before_after_caution": true,

      "medical_claims_caution": true

    },

    "notes": "公開情報のみ使用。視聴維持や平均視聴時間など非公開メトリクスは扱わない。"

  },



  "treatments": [

    {

      "name": "string",                             // 例: ダーマペン

      "aliases": ["string"],                        // 同義語・機器名・薬剤名

      "concerns": ["string"],                       // 共起する悩み語（毛穴/赤み/小顔 等）

      "signals": {

        "volume_est": number | "unknown",           // 期間中の関連動画推定本数

        "growth_rate_pct": number | "unknown",

        "median_engagement_rate_pct": number | "unknown",

        "view_velocity_per_day": number | "unknown"

      },

      "format_mix_pct": { "short": number | "unknown", "long": number | "unknown", "live": number | "unknown" },

      "length_mix_bins_pct": { "<60s": number | "unknown", "1-3m": number | "unknown", "3-8m": number | "unknown", "8-20m": number | "unknown", ">20m": number | "unknown" },

      "lifecycle": "emerging|peaking|maturing|declining",

      "price_mentions": {

        "examples": ["¥18000 など"],

        "range_jpy": { "p25": number | "unknown", "median": number | "unknown", "p75": number | "unknown" }

      },

      "safety_topics": ["ダウンタイム","内出血","禁忌","麻酔"],

      "misinformation_patterns": ["string"],        // 例：即効断定/比較優良誤認 等

      "representative_videos": [

        { "url": "https://www.youtube.com/watch?v=...", "format": "short|long|live", "length_bin": "1-3m|...", "engagement_rate_pct": number | "unknown", "fetchedAt": "${iso8601Date}" }

      ],

      "evidence": [

        { "url": "https://www.youtube.com/watch?v=...", "title_snippet": "string", "fetchedAt": "${iso8601Date}" }

      ]

    }

  ],



  "trending_keywords": [

    {

      "term": "string",                               // 例: 毛穴, 赤み, ダウンタイム

      "type": "keyword|hashtag|question",

      "volume_est": number | "unknown",

      "growth_rate_pct": number | "unknown",

      "co_terms": ["string"]

    }

  ],



  "top_videos": [

    {

      "title": "string",

      "url": "https://www.youtube.com/watch?v=...",

      "channel_title": "string",

      "channel_url": "https://www.youtube.com/@...",

      "subscribers": number | "unknown",

      "publishAt": "${iso8601Date}",

      "duration_sec": number | "unknown",

      "format": "short|long|live",

      "views": number | "unknown",

      "likes": number | "unknown",

      "comments": number | "unknown",

      "view_velocity_per_day": number | "unknown",

      "engagement_rate_pct": number | "unknown",

      "keywords_extracted": ["string"],

      "thumbnail_features": {

        "has_text_overlay": boolean | "unknown",

        "face_closeup": boolean | "unknown",

        "clinical_image_flag": boolean | "unknown",

        "before_after_flag": boolean | "unknown"

      },

      "risk_flags": ["medical_claims","before_after","giveaway","affiliate","clickbait"],

      "fetchedAt": "${iso8601Date}"

    }

  ],



  "top_creators": [

    {

      "channel_title": "string",

      "channel_url": "https://www.youtube.com/@...",

      "category": "clinic|doctor|influencer|device_brand|media",

      "subscribers": number | "unknown",

      "median_views_30d": number | "unknown",

      "post_freq_per_week": number | "unknown",

      "format_mix_pct": { "short": number | "unknown", "long": number | "unknown", "live": number | "unknown" },

      "representative_videos": [

        { "url": "https://www.youtube.com/watch?v=...", "format": "short|long|live", "fetchedAt": "${iso8601Date}" }

      ],

      "notes": "string"

    }

  ],



  "content_stats": {

    "format_distribution_pct": { "short": number | "unknown", "long": number | "unknown", "live": number | "unknown" },

    "median_views_by_length_bin": [

      { "bin": "<60s", "median_views": number | "unknown" },

      { "bin": "1-3m", "median_views": number | "unknown" },

      { "bin": "3-8m", "median_views": number | "unknown" },

      { "bin": "8-20m", "median_views": number | "unknown" },

      { "bin": ">20m", "median_views": number | "unknown" }

    ],

    "median_engagement_rate_pct_by_length_bin": [

      { "bin": "<60s", "median_er_pct": number | "unknown" },

      { "bin": "1-3m", "median_er_pct": number | "unknown" },

      { "bin": "3-8m", "median_er_pct": number | "unknown" },

      { "bin": "8-20m", "median_er_pct": number | "unknown" },

      { "bin": ">20m", "median_er_pct": number | "unknown" }

    ]

  },



  "audience_signals": [

    { "theme": "ダウンタイム・赤み", "example_comments": ["何日休めば？","当日はメイク可能？"] },

    { "theme": "価格・初回・モニター", "example_comments": ["初回いくら？","モニター募集は？"] },

    { "theme": "安全性・痛み", "example_comments": ["神経/血管リスク？","麻酔は？"] }

  ],



  "biasNotes": "懸賞/プロモ/クリックベイトによりERが歪む可能性。一過性バズに注意。",

  "sources": [{ "video_or_channel": "https://www.youtube.com/...", "count": number }],

  "gaps": ["視聴維持等の非公開指標は評価に含められない", "view_velocityは推定誤差を含む"]

}

</CONSENSUS_JSON>



【出力2：人向けMarkdown（研究レポート。運用Tipsは含めない）】

<REPORT_MARKDOWN>

## 概要

- 対象キーワード：${keywords.join(", ")} / 期間：${timeRangeText}（${location}）

- 観測要点（3点）：施術 × 悩み語 × ライフサイクルの所見（簡潔に）



### 1. 施術トレンドの全体像

- 投稿量/増勢/ER中央値を総合した上位施術（要約）

- ライフサイクルの分布（emerging/peaking/maturing/declining）



### 2. 施術別の詳細（上位）

| 施術 | 共起する悩み語 | 投稿数(推定) | 増加率 | ER中央値(%) | ライフサイクル | 価格言及(中央値) |

|---|---|---:|---:|---:|---|---:|

| 例 | 毛穴, 赤み | 1.2k | +18% | 3.1 | peaking | ¥18,000 |



### 3. キーワード・タイトル傾向

- よく使われる語/表記/疑問形や数値の有無など、**研究所見**として記載（運用助言はしない）



### 4. 長さ・構成と反応

- 長さの区分別の中央値（views/ER）を**観察結果**として記載（推奨は記さない）

- 章立て（チャプター）の有無と説明の丁寧さに関する所見



### 5. 安全性・誤情報

- よく触れられる安全性トピック（ダウンタイム/禁忌/麻酔 等）

- 誤情報パターン（即効断定/比較優良誤認/加工による誤認）と、その出典例



### 6. 価格言及（参考）

- キャプション/コメントから抽出できた価格レンジ（存在する場合のみ）と信頼性の注記



### 7. 方法・限界

- データ取得・正規化・ライフサイクル判定の方法

- サンプリングや一過性要因などの限界



### 8. 代表URL

- 動画/チャンネルの代表的なURLを列挙



### 総括

- 本期間における**施術トレンドの核心**（需要の横断所見）を1段落でまとめる

</REPORT_MARKDOWN>

</DEV>



<USER>

- キーワード: ${keywords.join(", ")}        // 例: ["ダーマペン","ピコレーザー","ヒアルロン酸"]

- 期間: ${timeRangeText}          // 例: "last 30 days"

- 地域(任意): ${location}        // 例: "Japan"（未指定なら "unknown"）

</USER>



【重要】以下のWeb検索結果を基に、最新のYouTubeトレンドを分析してください。
現在の日付は${currentDateStr}です。${currentYear}年${currentMonth}月時点の最新情報を優先的に使用してください。

${webSearchResults}`;

  const { getPrompt, replacePlaceholders } = await import("./prompt-helper");
  const template = await getPrompt("gemini_analyze_youtube_trends", defaultPrompt);
  const prompt = replacePlaceholders(template, { 
    keywords: keywords.join(", "),
    keywords_json: JSON.stringify(keywords),
    timeRange: timeRangeText,
    location: location || "unknown",
    generatedAt: iso8601Date,
  });
  
  return callGemini(prompt);
}

export async function researchCompetitorAnalysis(
  location: string,
  radius: number = 5,
): Promise<string> {
  // 現在の日付を取得（最新情報を取得するため）
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const currentDateStr = `${currentYear}年${currentMonth}月`;

  // Web検索を実行して最新情報を取得（SerpAPI必須）＋Google Maps Placesでの競合一覧取得
  const { 
    performWebSearchWithSerpAPIOnly, 
    formatSearchResults, 
    generateCompetitorSearchQuery,
    searchCompetitorsWithGooglePlaces,
    formatCompetitorPlacesForPrompt,
  } = await import("./web-search");
  const searchQuery = generateCompetitorSearchQuery(location, radius, currentYear, currentMonth);
  console.log(`[Competitor Analysis] Web検索実行: ${searchQuery}`);
  const searchResults = await performWebSearchWithSerpAPIOnly(searchQuery, 10);
  const webSearchResults = formatSearchResults(searchResults);
  console.log(`[Competitor Analysis] Web検索結果: ${searchResults.length}件取得`);

  // Google Maps Places APIで競合クリニック一覧を取得（キー未設定やエラー時は空配列）
  let googlePlacesSection = "";
  try {
    const places = await searchCompetitorsWithGooglePlaces(location, radius, 20);
    googlePlacesSection = formatCompetitorPlacesForPrompt(places);
    console.log(`[Competitor Analysis] Google Maps競合件数: ${places.length}件`);
  } catch (error) {
    console.warn("[Competitor Analysis] Google Mapsによる競合取得に失敗しましたが、続行します:", error);
  }

  const defaultPrompt = `あなたは美容皮膚科クリニックの競合調査専門家です。
${location}周辺${radius}km圏内の競合クリニックについて調査してください。

【重要】以下のWeb検索結果およびGoogle Mapsから取得した競合一覧を基に、最新の競合情報を分析してください。
現在の日付は${currentDateStr}です。${currentYear}年${currentMonth}月時点の最新情報を優先的に使用してください。

${webSearchResults}

${googlePlacesSection}

【分析指示】
以下の情報を、上記のWeb検索結果を基に収集してください：
1. 競合クリニックの名前と場所
2. 提供している主要な施術・治療
3. 各施術の価格設定
4. 特徴や強み

【重要】
- Web検索結果に含まれる最新の情報を優先的に使用してください
- 2024年以前の古い情報は使用しないでください
- 情報の出典（URL）を可能な限り明記してください
- 調査結果のタイトルや冒頭には「${currentDateStr}時点のWeb情報に基づき実施」と記載してください

各競合クリニックについて、わかりやすく読みやすい形式でまとめてください。最後に、競合分析の総括を記載してください。`;

  const { getPrompt, replacePlaceholders } = await import("./prompt-helper");
  const template = await getPrompt("gemini_research_competitor_analysis", defaultPrompt);
  const prompt = replacePlaceholders(template, { 
    location,
    radius: radius.toString(),
    googlePlacesSection: googlePlacesSection || "【Google Maps競合一覧】\n\nGoogle Mapsから取得できる競合クリニック情報は見つかりませんでした。\n",
  });
  
  return callGemini(prompt);
}

/**
 * 戦略分析: 市場ポジション分析
 */
export async function analyzeMarketPosition(
  clinicProducts: Array<{
    name: string;
    costPrice: number;
    sellingPrice: number;
    category?: string | null;
  }>,
  marketData: {
    trends?: string | Record<string, unknown> | null;
    pricing?: string | Record<string, unknown> | null;
    competitors?: string | Record<string, unknown> | null;
  },
  snsData: Array<string | Record<string, unknown>>,
  location: string,
): Promise<string> {
  try {
    const { getPrompt, replacePlaceholders } = await import("./prompt-helper");
    const { performWebSearchWithSerpAPIOnly, formatSearchResults, generateTrendSearchQuery } = await import("./web-search");
    
    // 現在の日付を取得
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    // Web検索を実行して最新情報を取得（SerpAPI必須）
    const searchQuery = generateTrendSearchQuery(location, currentYear, currentMonth);
    console.log(`[Gemini analyzeMarketPosition] Web検索実行: ${searchQuery}`);
    const searchResults = await performWebSearchWithSerpAPIOnly(searchQuery, 10);
    const webSearchResults = formatSearchResults(searchResults);
    console.log(`[Gemini analyzeMarketPosition] Web検索結果: ${searchResults.length}件取得`);
    
    // Claude用プロンプト（正式版）を取得
    const template = await getPrompt("claude_analyze_market_position", "");
    
    if (!template || template.trim().length === 0) {
      throw new Error("Failed to get prompt template for claude_analyze_market_position");
    }

    // データを処理（文字列の場合はそのまま使用、オブジェクトの場合は構造化データを優先）
    const clinicProductsFormatted = clinicProducts.map(p => ({
      商品名: p.name,
      原価: p.costPrice,
      販売価格: p.sellingPrice,
      カテゴリ: p.category || "未分類",
    }));
    
    // 市場データを処理（文字列の場合はそのまま使用、オブジェクトの場合は構造化）
    const marketDataFormatted: Record<string, unknown> = {};
    
    if (marketData.trends) {
      // 文字列の場合はそのまま使用（トークン量削減）
      if (typeof marketData.trends === "string") {
        marketDataFormatted.トレンド = marketData.trends;
      } else {
        // オブジェクトの場合は構造化データを優先的に使用
        const trends = marketData.trends as Record<string, unknown>;
        if (trends.consensusJSON) {
          marketDataFormatted.トレンド = trends.consensusJSON;
        } else if (trends.text) {
          marketDataFormatted.トレンド = trends.text;
        } else {
          marketDataFormatted.トレンド = trends;
        }
      }
    }
    
    if (marketData.pricing) {
      // 文字列の場合はそのまま使用（トークン量削減）
      if (typeof marketData.pricing === "string") {
        marketDataFormatted.価格情報 = marketData.pricing;
      } else {
        // オブジェクトの場合は構造化データを優先的に使用
        const pricing = marketData.pricing as Record<string, unknown>;
        if (pricing.consensusJSON) {
          marketDataFormatted.価格情報 = pricing.consensusJSON;
        } else if (pricing.text) {
          marketDataFormatted.価格情報 = pricing.text;
        } else {
          marketDataFormatted.価格情報 = pricing;
        }
      }
    }
    
    if (marketData.competitors) {
      // 文字列の場合はそのまま使用（トークン量削減）
      if (typeof marketData.competitors === "string") {
        marketDataFormatted.競合情報 = marketData.competitors;
      } else {
        // オブジェクトの場合は構造化データを優先的に使用
        const competitors = marketData.competitors as Record<string, unknown>;
        if (competitors.consensusJSON) {
          marketDataFormatted.競合情報 = competitors.consensusJSON;
        } else if (competitors.text) {
          marketDataFormatted.競合情報 = competitors.text;
        } else {
          marketDataFormatted.競合情報 = competitors;
        }
      }
    }
    
    // SNSデータを処理（文字列の場合はそのまま使用、オブジェクトの場合は構造化）
    const snsDataFormatted = snsData.map(s => {
      // 文字列の場合はそのまま使用（トークン量削減）
      if (typeof s === "string") {
        return s;
      }
      // オブジェクトの場合は構造化データを優先的に使用
      const data = s as Record<string, unknown>;
      if (data.consensusJSON) {
        return data.consensusJSON;
      } else if (data.text) {
        return data.text;
      } else if (data.platform) {
        // platformプロパティがある場合は、データをそのまま返す
        return data;
      }
      return s;
    });

    // JSON.stringifyのインデントを削除してトークン量を削減
    const prompt = replacePlaceholders(template, {
      clinicProducts: JSON.stringify(clinicProductsFormatted),
      marketData: JSON.stringify(marketDataFormatted),
      snsData: JSON.stringify(snsDataFormatted),
      location,
    });

    console.log(`[Gemini analyzeMarketPosition] Template length: ${template.length}, Prompt length: ${prompt.length} characters`);
    console.log(`[Gemini analyzeMarketPosition] 商品数: ${clinicProducts.length}, 市場データ: ${JSON.stringify(marketDataFormatted).length}文字, SNSデータ: ${snsData.length}件`);

    // Web検索結果をプロンプトに追加
    const promptWithWebSearch = `${prompt}\n\n${webSearchResults}`;
    
    console.log(`[Gemini analyzeMarketPosition] Prompt length with web search: ${promptWithWebSearch.length} characters`);
    
    const result = await callGemini(promptWithWebSearch);
    console.log(`[Gemini analyzeMarketPosition] Result length: ${result.length} characters`);
    return result;
  } catch (error) {
    console.error("[Gemini analyzeMarketPosition] Error:", error);
    throw error;
  }
}

/**
 * 戦略分析: 価格設定提案
 */
export async function generatePriceRecommendations(
  products: Array<{
    name: string;
    costPrice: number;
    sellingPrice: number;
    category?: string | null;
  }>,
  marketPricing: Record<string, unknown>,
): Promise<string> {
  try {
    const { getPrompt, replacePlaceholders } = await import("./prompt-helper");
    const { performWebSearchWithSerpAPIOnly, formatSearchResults, generatePriceSearchQuery } = await import("./web-search");
    
    // 現在の日付を取得
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    // 商品名から検索クエリを生成
    const productNames = products.map(p => p.name);
    // 市場価格データから都市情報を抽出（可能な場合）
    const cities: string[] = [];
    if (marketPricing && typeof marketPricing === "object") {
      // marketPricingが配列の場合、各要素から都市情報を抽出
      if (Array.isArray(marketPricing)) {
        marketPricing.forEach(item => {
          if (item && typeof item === "object" && "city" in item && typeof item.city === "string") {
            if (!cities.includes(item.city)) {
              cities.push(item.city);
            }
          }
        });
      }
      // marketPricingがオブジェクトの場合、キーから都市情報を推測
      else {
        Object.keys(marketPricing).forEach(key => {
          if (key.includes("東京") || key.includes("大阪") || key.includes("名古屋") || key.includes("福岡")) {
            const city = key.match(/(東京|大阪|名古屋|福岡|横浜|京都|神戸|札幌|仙台|広島)/)?.[0];
            if (city && !cities.includes(city)) {
              cities.push(city);
            }
          }
        });
      }
    }
    // 都市情報が取得できない場合はデフォルトの都市を使用
    if (cities.length === 0) {
      cities.push("東京", "大阪", "名古屋");
    }
    
    // Web検索を実行して最新の価格情報を取得（SerpAPI必須）
    const searchQuery = generatePriceSearchQuery(productNames, cities, currentYear, currentMonth);
    console.log(`[Gemini generatePriceRecommendations] Web検索実行: ${searchQuery}`);
    const searchResults = await performWebSearchWithSerpAPIOnly(searchQuery, 10);
    const webSearchResults = formatSearchResults(searchResults);
    console.log(`[Gemini generatePriceRecommendations] Web検索結果: ${searchResults.length}件取得`);
    
    // Claude用プロンプト（正式版）を取得
    const template = await getPrompt("claude_generate_price_recommendations", "");
    
    if (!template || template.trim().length === 0) {
      throw new Error("Failed to get prompt template for claude_generate_price_recommendations");
    }

    // データを処理（文字列の場合はそのまま使用、オブジェクトの場合は構造化データを優先）
    const productsFormatted = products.map(p => ({
      商品名: p.name,
      現在価格: p.sellingPrice,
      原価: p.costPrice,
      カテゴリ: p.category || "未分類",
    }));

    // 市場価格データを処理（文字列の場合はそのまま使用、オブジェクトの場合は構造化）
    let marketPricingFormatted: unknown = marketPricing;
    
    if (marketPricing && typeof marketPricing === "object") {
      const pricing = marketPricing as Record<string, unknown>;
      // 構造化データを優先的に使用
      if (pricing.consensusJSON) {
        marketPricingFormatted = pricing.consensusJSON;
      } else if (pricing.text) {
        marketPricingFormatted = pricing.text;
      } else if (pricing.data && Array.isArray(pricing.data)) {
        // 配列データの場合はそのまま使用
        marketPricingFormatted = pricing.data;
      } else {
        marketPricingFormatted = pricing;
      }
    }

    // JSON.stringifyのインデントを削除してトークン量を削減
    const prompt = replacePlaceholders(template, {
      products: JSON.stringify(productsFormatted),
      marketPricing: JSON.stringify(marketPricingFormatted),
    });

    console.log(`[Gemini generatePriceRecommendations] Template length: ${template.length}, Prompt length: ${prompt.length} characters`);
    console.log(`[Gemini generatePriceRecommendations] 商品数: ${products.length}, 市場価格データ: ${JSON.stringify(marketPricing).length}文字`);

    // Web検索結果をプロンプトに追加
    const promptWithWebSearch = `${prompt}\n\n${webSearchResults}`;
    
    console.log(`[Gemini generatePriceRecommendations] Prompt length with web search: ${promptWithWebSearch.length} characters`);
    
    const result = await callGemini(promptWithWebSearch);
    console.log(`[Gemini generatePriceRecommendations] Result length: ${result.length} characters`);
    return result;
  } catch (error) {
    console.error("[Gemini generatePriceRecommendations] Error:", error);
    throw error;
  }
}

/**
 * 戦略分析: キャンペーン案生成
 */
export async function generateCampaignProposals(
  trends: Array<Record<string, unknown>>,
  snsData: Array<Record<string, unknown>>,
): Promise<string> {
  try {
    const { getPrompt, replacePlaceholders } = await import("./prompt-helper");
    const { performWebSearchWithSerpAPIOnly, formatSearchResults } = await import("./web-search");
    
    // 現在の日付を取得
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    // トレンドからキーワードを抽出してWeb検索クエリを生成
    const keywords: string[] = [];
    trends.forEach(trend => {
      const trendData = trend as Record<string, unknown>;
      // 構造化データからキーワードを抽出
      if (trendData.consensusJSON && typeof trendData.consensusJSON === "object") {
        const consensus = trendData.consensusJSON as Record<string, unknown>;
        if (consensus.treatments && Array.isArray(consensus.treatments)) {
          const treatments = consensus.treatments as Array<{ name?: string }>;
          treatments.forEach(t => {
            if (t.name && typeof t.name === "string") {
              keywords.push(t.name);
            }
          });
        }
      }
      // フォールバック: treatmentsプロパティから直接取得
      if (trendData.treatments && Array.isArray(trendData.treatments)) {
        const treatments = trendData.treatments as Array<{ name?: string }>;
        treatments.forEach(t => {
          if (t.name && typeof t.name === "string") {
            keywords.push(t.name);
          }
        });
      }
    });
    
    // Web検索を実行して最新のキャンペーントレンドを取得（SerpAPI必須）
    const searchQuery = `美容クリニック キャンペーン ${keywords.slice(0, 3).join(" ")} ${currentYear}年${currentMonth}月 トレンド`;
    console.log(`[Gemini generateCampaignProposals] Web検索実行: ${searchQuery}`);
    const searchResults = await performWebSearchWithSerpAPIOnly(searchQuery, 10);
    const webSearchResults = formatSearchResults(searchResults);
    console.log(`[Gemini generateCampaignProposals] Web検索結果: ${searchResults.length}件取得`);
    
    // Claude用プロンプト（正式版）を取得
    const template = await getPrompt("claude_generate_campaign_proposals", "");
    
    if (!template || template.trim().length === 0) {
      throw new Error("Failed to get prompt template for claude_generate_campaign_proposals");
    }

    // データを処理（文字列の場合はそのまま使用、オブジェクトの場合は構造化データを優先）
    const trendsFormatted = trends.map(t => {
      // 文字列の場合はそのまま使用（トークン量削減）
      if (typeof t === "string") {
        return t;
      }
      // オブジェクトの場合は構造化データを優先的に使用
      const trendData = t as Record<string, unknown>;
      if (trendData.consensusJSON) {
        return trendData.consensusJSON;
      } else if (trendData.text) {
        return trendData.text;
      }
      return t;
    });
    
    const snsDataFormatted = snsData.map(s => {
      // 文字列の場合はそのまま使用（トークン量削減）
      if (typeof s === "string") {
        return s;
      }
      // オブジェクトの場合は構造化データを優先的に使用
      const snsDataItem = s as Record<string, unknown>;
      if (snsDataItem.consensusJSON) {
        return snsDataItem.consensusJSON;
      } else if (snsDataItem.text) {
        return snsDataItem.text;
      }
      return s;
    });

    // JSON.stringifyのインデントを削除してトークン量を削減
    const prompt = replacePlaceholders(template, {
      trends: JSON.stringify(trendsFormatted),
      snsData: JSON.stringify(snsDataFormatted),
    });

    console.log(`[Gemini generateCampaignProposals] trends: ${trends.length}件, snsData: ${snsData.length}件`);
    console.log(`[Gemini generateCampaignProposals] Template length: ${template.length}, Prompt length: ${prompt.length} characters`);

    // Web検索結果をプロンプトに追加
    const promptWithWebSearch = `${prompt}\n\n${webSearchResults}`;
    
    console.log(`[Gemini generateCampaignProposals] Prompt length with web search: ${promptWithWebSearch.length} characters`);
    
    const result = await callGemini(promptWithWebSearch);
    console.log(`[Gemini generateCampaignProposals] Result length: ${result.length} characters`);
    return result;
  } catch (error) {
    console.error("[Gemini generateCampaignProposals] Error:", error);
    throw error;
  }
}

/**
 * 戦略分析: 新施術提案
 */
export async function suggestNewTreatments(
  currentTreatments: Array<{
    name: string;
    category?: string | null;
  }>,
  marketTrends: Array<Record<string, unknown>>,
  snsTrends: Array<Record<string, unknown>>,
): Promise<string> {
  try {
    const { getPrompt, replacePlaceholders } = await import("./prompt-helper");
    const { performWebSearchWithSerpAPIOnly, formatSearchResults } = await import("./web-search");
    
    // 現在の日付を取得
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    // 市場トレンドとSNSトレンドからキーワードを抽出してWeb検索クエリを生成
    const keywords: string[] = [];
    marketTrends.forEach(trend => {
      const trendData = trend as Record<string, unknown>;
      // 構造化データからキーワードを抽出
      if (trendData.consensusJSON && typeof trendData.consensusJSON === "object") {
        const consensus = trendData.consensusJSON as Record<string, unknown>;
        if (consensus.treatments && Array.isArray(consensus.treatments)) {
          const treatments = consensus.treatments as Array<{ name?: string }>;
          treatments.forEach(t => {
            if (t.name && typeof t.name === "string") {
              keywords.push(t.name);
            }
          });
        }
      }
      // フォールバック: treatmentsプロパティから直接取得
      if (trendData.treatments && Array.isArray(trendData.treatments)) {
        const treatments = trendData.treatments as Array<{ name?: string }>;
        treatments.forEach(t => {
          if (t.name && typeof t.name === "string") {
            keywords.push(t.name);
          }
        });
      }
    });
    
    // Web検索を実行して最新の施術トレンドを取得（SerpAPI必須）
    const searchQuery = `美容クリニック 新施術 ${keywords.slice(0, 3).join(" ")} ${currentYear}年${currentMonth}月 トレンド`;
    console.log(`[Gemini suggestNewTreatments] Web検索実行: ${searchQuery}`);
    const searchResults = await performWebSearchWithSerpAPIOnly(searchQuery, 10);
    const webSearchResults = formatSearchResults(searchResults);
    console.log(`[Gemini suggestNewTreatments] Web検索結果: ${searchResults.length}件取得`);
    
    // Claude用プロンプト（正式版）を取得
    const template = await getPrompt("claude_suggest_new_treatments", "");
    
    if (!template || template.trim().length === 0) {
      throw new Error("Failed to get prompt template for claude_suggest_new_treatments");
    }

    // データを処理（文字列の場合はそのまま使用、オブジェクトの場合は構造化データを優先）
    const currentTreatmentsFormatted = currentTreatments.map(t => ({
      施術名: t.name,
      カテゴリ: t.category || "未分類",
    }));
    
    const marketTrendsFormatted = marketTrends.map(t => {
      // 文字列の場合はそのまま使用（トークン量削減）
      if (typeof t === "string") {
        return t;
      }
      // オブジェクトの場合は構造化データを優先的に使用
      const trendData = t as Record<string, unknown>;
      if (trendData.consensusJSON) {
        return trendData.consensusJSON;
      } else if (trendData.text) {
        return trendData.text;
      }
      return t;
    });
    
    const snsTrendsFormatted = snsTrends.map(s => {
      // 文字列の場合はそのまま使用（トークン量削減）
      if (typeof s === "string") {
        return s;
      }
      // オブジェクトの場合は構造化データを優先的に使用
      const snsDataItem = s as Record<string, unknown>;
      if (snsDataItem.consensusJSON) {
        return snsDataItem.consensusJSON;
      } else if (snsDataItem.text) {
        return snsDataItem.text;
      }
      return s;
    });

    // JSON.stringifyのインデントを削除してトークン量を削減
    const prompt = replacePlaceholders(template, {
      currentTreatments: JSON.stringify(currentTreatmentsFormatted),
      marketTrends: JSON.stringify(marketTrendsFormatted),
      snsTrends: JSON.stringify(snsTrendsFormatted),
    });

    console.log(`[Gemini suggestNewTreatments] currentTreatments: ${currentTreatments.length}件, marketTrends: ${marketTrends.length}件, snsTrends: ${snsTrends.length}件`);
    console.log(`[Gemini suggestNewTreatments] Template length: ${template.length}, Prompt length: ${prompt.length} characters`);

    // Web検索結果をプロンプトに追加
    const promptWithWebSearch = `${prompt}\n\n${webSearchResults}`;
    
    console.log(`[Gemini suggestNewTreatments] Prompt length with web search: ${promptWithWebSearch.length} characters`);
    
    const result = await callGemini(promptWithWebSearch);
    console.log(`[Gemini suggestNewTreatments] Result length: ${result.length} characters`);
    return result;
  } catch (error) {
    console.error("[Gemini suggestNewTreatments] Error:", error);
    throw error;
  }
}

/**
 * 現在使用中のGeminiモデル名を取得（デバッグ用）
 */
export function getCurrentGeminiModel(): string | null {
  return cachedModelName || process.env.GEMINI_MODEL || null;
}

