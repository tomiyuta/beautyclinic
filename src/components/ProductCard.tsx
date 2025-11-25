"use client";

import { motion } from "framer-motion";
import Button from "@atlaskit/button";
import Badge from "@atlaskit/badge";
import type { ClinicProduct } from "@/generated/prisma/client";

interface ProductCardProps {
  product: ClinicProduct;
  onDelete: (product: ClinicProduct) => void;
  isDeleting?: boolean;
}

export function ProductCard({ product, onDelete, isDeleting }: ProductCardProps) {
  const profit = product.sellingPrice - product.costPrice;
  const profitRate = ((profit / product.costPrice) * 100).toFixed(1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -4, boxShadow: "0 8px 16px rgba(0,0,0,0.1)" }}
      transition={{ duration: 0.2 }}
      style={{
        background: "#FFFFFF",
        borderRadius: "8px",
        padding: "clamp(12px, 2vw, 20px)",
        border: "1px solid #DFE1E6",
        cursor: "pointer",
        position: "relative",
        minWidth: 0, // グリッドアイテムのオーバーフローを防ぐ
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#172B4D", margin: "0 0 4px 0" }}>
            {product.name}
          </h3>
          {product.category && (
            <p style={{ fontSize: "12px", color: "#6B778C", margin: 0 }}>
              {product.category}
            </p>
          )}
        </div>
        <Badge appearance={product.isActive ? "added" : "removed"}>
          {product.isActive ? "販売中" : "停止中"}
        </Badge>
      </div>

      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "1fr 1fr", 
        gap: "12px",
        marginBottom: "12px",
        padding: "12px",
        background: "#F4F5F7",
        borderRadius: "6px"
      }}>
        <div>
          <p style={{ fontSize: "11px", color: "#6B778C", margin: "0 0 4px 0" }}>原価</p>
          <p style={{ fontSize: "16px", fontWeight: 600, color: "#42526E", margin: 0 }}>
            {product.costPrice.toLocaleString()}円
          </p>
        </div>
        <div>
          <p style={{ fontSize: "11px", color: "#6B778C", margin: "0 0 4px 0" }}>販売価格</p>
          <p style={{ fontSize: "16px", fontWeight: 600, color: "#172B4D", margin: 0 }}>
            {product.sellingPrice.toLocaleString()}円
          </p>
        </div>
      </div>

      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        paddingTop: "12px",
        borderTop: "1px solid #DFE1E6"
      }}>
        <div>
          <p style={{ fontSize: "11px", color: "#6B778C", margin: "0 0 4px 0" }}>利益率</p>
          <p style={{ 
            fontSize: "18px", 
            fontWeight: 700, 
            color: profit > 0 ? "#36B37E" : "#DE350B",
            margin: 0 
          }}>
            {profitRate}%
          </p>
        </div>
        <Button
          appearance="subtle-link"
          onClick={() => onDelete(product)}
          isDisabled={isDeleting}
        >
          削除
        </Button>
      </div>
    </motion.div>
  );
}

