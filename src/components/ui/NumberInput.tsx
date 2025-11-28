"use client";

import { useState, useEffect } from "react";
import TextField from "@atlaskit/textfield";

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  label?: string;
  min?: number;
  max?: number;
  required?: boolean;
  disabled?: boolean;
}

export function NumberInput({
  value,
  onChange,
  placeholder,
  label,
  min,
  max,
  required = false,
  disabled = false,
}: NumberInputProps) {
  const [displayValue, setDisplayValue] = useState("");

  // 数値をカンマ区切りの文字列に変換
  const formatNumber = (num: number): string => {
    if (num === 0 || isNaN(num)) return "";
    return new Intl.NumberFormat("ja-JP").format(num);
  };

  // カンマ区切りの文字列を数値に変換
  const parseNumber = (str: string): number => {
    const cleaned = str.replace(/,/g, "");
    const parsed = parseInt(cleaned, 10);
    return isNaN(parsed) ? 0 : parsed;
  };

  // 初期値の設定
  useEffect(() => {
    setDisplayValue(formatNumber(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;

    // 数字とカンマのみを許可
    const cleaned = input.replace(/[^\d,]/g, "");

    // カンマを除去して数値に変換
    const numValue = parseNumber(cleaned);

    // min/maxの制約をチェック
    let finalValue = numValue;
    if (min !== undefined && numValue < min) {
      finalValue = min;
    }
    if (max !== undefined && numValue > max) {
      finalValue = max;
    }

    // 表示用の値を更新（入力中はそのまま、フォーカスアウト時にフォーマット）
    setDisplayValue(cleaned);
    onChange(finalValue);
  };

  const handleBlur = () => {
    // フォーカスアウト時に正しくフォーマット
    setDisplayValue(formatNumber(value));
  };

  return (
    <div>
      {label && (
        <label
          style={{
            display: "block",
            marginBottom: "8px",
            fontSize: "14px",
            fontWeight: 500,
            color: "#42526E",
          }}
        >
          {label} {required && <span style={{ color: "#DE350B" }}>*</span>}
        </label>
      )}
      <TextField
        type="text"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        isRequired={required}
        isDisabled={disabled}
        style={{ width: "100%" }}
      />
    </div>
  );
}

