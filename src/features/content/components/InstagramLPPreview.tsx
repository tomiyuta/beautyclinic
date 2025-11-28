"use client";

import { useRef } from "react";
import Button from "@atlaskit/button";

interface InstagramLPPreviewProps {
  content: unknown;
  onExportImage?: (element: HTMLElement) => void;
}

export function InstagramLPPreview({ content, onExportImage }: InstagramLPPreviewProps) {
  const contentText = typeof content === "string" ? content : String(content);
  
  const parseContent = (text: string) => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    
    let title = '';
    let headline = '';
    let description = '';
    const keyPoints: string[] = [];
    const benefits: string[] = [];
    let callToAction = '';
    const hashtags: string[] = [];
    
    let currentSection = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      
      if (line.includes('タイトル') || line.includes('タイトル:')) {
        currentSection = 'title';
        title = line.replace(/.*[:：]\s*/, '').trim() || lines[i + 1]?.trim() || '';
        if (title) i++;
        continue;
      }
      if (line.includes('ヘッドライン') || line.includes('メインヘッドライン')) {
        currentSection = 'headline';
        headline = line.replace(/.*[:：]\s*/, '').trim() || lines[i + 1]?.trim() || '';
        if (headline) i++;
        continue;
      }
      if (line.includes('説明') || line.includes('説明文')) {
        currentSection = 'description';
        continue;
      }
      if (line.includes('ポイント') || line.includes('キーポイント') || line.includes('主要ポイント')) {
        currentSection = 'keyPoints';
        continue;
      }
      if (line.includes('メリット') || line.includes('特典') || line.includes('ベネフィット')) {
        currentSection = 'benefits';
        continue;
      }
      if (line.includes('行動喚起') || line.includes('CTA') || line.includes('コールトゥアクション')) {
        currentSection = 'cta';
        callToAction = line.replace(/.*[:：]\s*/, '').trim() || lines[i + 1]?.trim() || '';
        if (callToAction) i++;
        continue;
      }
      if (line.includes('ハッシュタグ') || line.includes('ハッシュタッグ')) {
        currentSection = 'hashtags';
        continue;
      }
      
      if (currentSection === 'title' && !title && line) title = line;
      else if (currentSection === 'headline' && !headline && line) headline = line;
      else if (currentSection === 'description' && line && !line.startsWith('-') && !line.startsWith('•') && !line.startsWith('*')) {
        description += (description ? '\n' : '') + line;
      }
      else if (currentSection === 'keyPoints' && (line.startsWith('-') || line.startsWith('•') || line.startsWith('*') || line.startsWith('✓'))) {
        keyPoints.push(line.replace(/^[-•*✓]\s*/, '').trim());
      }
      else if (currentSection === 'benefits' && (line.startsWith('-') || line.startsWith('•') || line.startsWith('*'))) {
        benefits.push(line.replace(/^[-•*]\s*/, '').trim());
      }
      else if (currentSection === 'cta' && !callToAction && line) callToAction = line;
      else if (currentSection === 'hashtags' && (line.includes('#') || line.match(/^[#＃]/))) {
        const tags = line.match(/#[\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+/g) || [];
        hashtags.push(...tags.map(t => t.replace('#', '')));
      }
    }
    
    if (!title && !headline && lines.length > 0) {
      headline = lines[0]!;
    }
    if (!description && lines.length > 1) {
      description = lines.slice(1, 4).join('\n');
    }
    
    return { title, headline, description, keyPoints, benefits, callToAction, hashtags };
  };
  
  const parsed = parseContent(contentText);
  const displayTitle = parsed.title || parsed.headline || '';
  const displayDescription = parsed.description || contentText.split('\n').slice(1, 4).join('\n') || contentText;

  const previewRef = useRef<HTMLDivElement>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {onExportImage && (
        <Button
          appearance="primary"
          onClick={() => {
            if (previewRef.current) {
              onExportImage(previewRef.current);
            }
          }}
        >
          📥 画像としてダウンロード
        </Button>
      )}
      <div ref={previewRef} style={{ margin: "0 auto", maxWidth: "400px", borderRadius: "8px", border: "2px solid #C1C7D0", background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.12)" }}>
        {/* Instagram風のヘッダー */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid #DFE1E6", padding: "12px 16px", background: "#FFFFFF" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "linear-gradient(to bottom right, #9333EA, #EC4899)" }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "#172B4D" }}>美容クリニック</div>
          </div>
        </div>

        {/* メインコンテンツ */}
        <div style={{ padding: "24px", background: "#FFFFFF" }}>
          {displayTitle && (
            <h3 style={{ marginBottom: "16px", fontSize: "20px", fontWeight: 700, color: "#172B4D", lineHeight: "1.25" }}>
              {displayTitle}
            </h3>
          )}

          {displayDescription && (
            <p style={{ marginBottom: "16px", whiteSpace: "pre-line", fontSize: "14px", lineHeight: "1.75", color: "#42526E" }}>
              {displayDescription}
            </p>
          )}

          {parsed.keyPoints.length > 0 && (
            <div style={{ marginBottom: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
              {parsed.keyPoints.map((point, index) => (
                <div key={index} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <span style={{ marginTop: "4px", color: "#0052CC", fontWeight: 700 }}>✓</span>
                  <span style={{ flex: 1, fontSize: "14px", color: "#42526E" }}>{point}</span>
                </div>
              ))}
            </div>
          )}

          {parsed.benefits.length > 0 && (
            <div style={{ marginBottom: "16px", borderRadius: "8px", background: "linear-gradient(to right, #FDF2F8, #FAF5FF)", padding: "16px" }}>
              <h4 style={{ marginBottom: "8px", fontSize: "14px", fontWeight: 600, color: "#172B4D" }}>✨ 特典</h4>
              <ul style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {parsed.benefits.map((benefit, index) => (
                  <li key={index} style={{ fontSize: "14px", color: "#42526E" }}>
                    • {benefit}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {parsed.callToAction && (
            <button style={{ marginBottom: "16px", width: "100%", borderRadius: "8px", background: "linear-gradient(to right, #EC4899, #9333EA)", padding: "12px 16px", fontSize: "16px", fontWeight: 600, color: "#FFFFFF", border: "none", cursor: "pointer", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
              {parsed.callToAction}
            </button>
          )}

          {parsed.hashtags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", borderTop: "1px solid #DFE1E6", paddingTop: "12px" }}>
              {parsed.hashtags.map((tag, index) => (
                <span
                  key={index}
                  style={{ fontSize: "12px", color: "#0052CC", fontWeight: 500 }}
                >
                  #{tag.replace(/^#/, "")}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* フッター */}
        <div style={{ borderTop: "1px solid #DFE1E6", padding: "12px 16px", background: "#FFFFFF" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: "16px", color: "#6B778C" }}>
            <span style={{ fontSize: "20px" }}>❤️</span>
            <span style={{ fontSize: "20px" }}>💬</span>
            <span style={{ fontSize: "20px" }}>📤</span>
            <span style={{ marginLeft: "auto", fontSize: "12px" }}>{new Date().toLocaleDateString("ja-JP")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

