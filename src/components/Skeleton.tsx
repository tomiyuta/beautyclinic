"use client";

import { motion } from "framer-motion";

export function SkeletonCard() {
  return (
    <div style={{
      background: "#FFFFFF",
      borderRadius: "8px",
      padding: "20px",
      border: "1px solid #DFE1E6",
    }}>
      <motion.div
        animate={{
          background: [
            "linear-gradient(90deg, #F4F5F7 0%, #EBECF0 50%, #F4F5F7 100%)",
            "linear-gradient(90deg, #EBECF0 0%, #F4F5F7 50%, #EBECF0 100%)",
          ],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "linear",
        }}
        style={{
          height: "20px",
          borderRadius: "4px",
          marginBottom: "12px",
          width: "60%",
        }}
      />
      <motion.div
        animate={{
          background: [
            "linear-gradient(90deg, #F4F5F7 0%, #EBECF0 50%, #F4F5F7 100%)",
            "linear-gradient(90deg, #EBECF0 0%, #F4F5F7 50%, #EBECF0 100%)",
          ],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "linear",
          delay: 0.2,
        }}
        style={{
          height: "16px",
          borderRadius: "4px",
          marginBottom: "12px",
          width: "40%",
        }}
      />
      <motion.div
        animate={{
          background: [
            "linear-gradient(90deg, #F4F5F7 0%, #EBECF0 50%, #F4F5F7 100%)",
            "linear-gradient(90deg, #EBECF0 0%, #F4F5F7 50%, #EBECF0 100%)",
          ],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "linear",
          delay: 0.4,
        }}
        style={{
          height: "60px",
          borderRadius: "4px",
        }}
      />
    </div>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
      gap: "16px",
    }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead style={{ background: "#F4F5F7" }}>
          <tr>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <th key={i} style={{ padding: "12px 16px", textAlign: "left", fontSize: "14px", fontWeight: 600, color: "#42526E", borderBottom: "1px solid #DFE1E6" }}>
                <motion.div
                  animate={{
                    background: [
                      "linear-gradient(90deg, #F4F5F7 0%, #EBECF0 50%, #F4F5F7 100%)",
                      "linear-gradient(90deg, #EBECF0 0%, #F4F5F7 50%, #EBECF0 100%)",
                    ],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  style={{
                    height: "16px",
                    borderRadius: "4px",
                    width: "80%",
                  }}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex} style={{ borderBottom: "1px solid #DFE1E6" }}>
              {[1, 2, 3, 4, 5, 6].map((colIndex) => (
                <td key={colIndex} style={{ padding: "12px 16px" }}>
                  <motion.div
                    animate={{
                      background: [
                        "linear-gradient(90deg, #F4F5F7 0%, #EBECF0 50%, #F4F5F7 100%)",
                        "linear-gradient(90deg, #EBECF0 0%, #F4F5F7 50%, #EBECF0 100%)",
                      ],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "linear",
                      delay: (rowIndex * 0.1) + (colIndex * 0.05),
                    }}
                    style={{
                      height: "16px",
                      borderRadius: "4px",
                      width: colIndex === 1 ? "90%" : colIndex === 6 ? "60%" : "70%",
                    }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

