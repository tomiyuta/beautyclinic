"use client";

import { useState, useRef } from "react";
import TextField from "@atlaskit/textfield";
import { motion } from "framer-motion";

interface AnimatedTextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  type?: string;
  inputMode?: "text" | "numeric" | "tel" | "email";
  style?: React.CSSProperties;
}

export function AnimatedTextField({
  label,
  value,
  onChange,
  placeholder,
  required,
  error,
  type = "text",
  inputMode,
  style,
}: AnimatedTextFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isActive = isFocused || value.length > 0;

  return (
    <div style={{ position: "relative", marginBottom: "24px", ...style }}>
      <motion.label
        initial={false}
        animate={{
          y: isActive ? -28 : 0,
          fontSize: isActive ? 12 : 14,
          color: error ? "#DE350B" : isActive ? "#0052CC" : "#42526E",
        }}
        transition={{ duration: 0.2 }}
        style={{
          position: "absolute",
          left: "12px",
          top: "12px",
          pointerEvents: "none",
          fontWeight: isActive ? 500 : 400,
          zIndex: 1,
          background: "#FFFFFF",
          padding: "0 4px",
          whiteSpace: "nowrap",
        }}
        onClick={() => inputRef.current?.focus()}
      >
        {label} {required && <span style={{ color: "#DE350B" }}>*</span>}
      </motion.label>
      
      <TextField
        ref={inputRef}
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange((e.target as HTMLInputElement).value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={isActive ? placeholder : ""}
        isInvalid={!!error}
        style={{
          width: "100%",
          paddingTop: isActive ? "20px" : "12px",
        }}
      />
      
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            fontSize: "12px",
            color: "#DE350B",
            marginTop: "4px",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <span>⚠️</span>
          <span>{error}</span>
        </motion.div>
      )}
    </div>
  );
}

