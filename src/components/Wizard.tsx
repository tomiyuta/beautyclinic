"use client";

import { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@atlaskit/button";
import Badge from "@atlaskit/badge";

interface WizardStep {
  id: string;
  title: string;
  description?: string;
  component: ReactNode;
}

interface WizardProps {
  steps: WizardStep[];
  currentStep: number;
  onStepChange: (step: number) => void;
  onComplete?: () => void;
  canGoNext?: boolean;
  canGoBack?: boolean;
  isLoading?: boolean;
}

export function Wizard({
  steps,
  currentStep,
  onStepChange,
  onComplete,
  canGoNext = true,
  canGoBack = true,
  isLoading = false,
}: WizardProps) {
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  const currentStepData = steps[currentStep];

  const handleNext = () => {
    if (isLastStep && onComplete) {
      onComplete();
    } else if (currentStep < steps.length - 1) {
      onStepChange(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      onStepChange(currentStep - 1);
    }
  };

  return (
    <div style={{ width: "100%" }}>
      {/* ステップインジケーター */}
      <div style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          {steps.map((step, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;
            const isUpcoming = index > currentStep;

            return (
              <div
                key={step.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  flex: 1,
                  position: "relative",
                }}
              >
                {/* ステップ番号とアイコン */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "8px",
                    flex: 1,
                    zIndex: 2,
                  }}
                >
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      background: isCompleted
                        ? "#36B37E"
                        : isCurrent
                          ? "#0052CC"
                          : "#DFE1E6",
                      color: isCompleted || isCurrent ? "#FFFFFF" : "#6B778C",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 600,
                      fontSize: "14px",
                      transition: "all 0.3s ease",
                      cursor: isUpcoming ? "not-allowed" : "pointer",
                    }}
                    onClick={() => {
                      if (!isUpcoming && index !== currentStep) {
                        onStepChange(index);
                      }
                    }}
                  >
                    {isCompleted ? "✓" : index + 1}
                  </div>
                  <div
                    style={{
                      textAlign: "center",
                      fontSize: "12px",
                      color: isCurrent ? "#0052CC" : isCompleted ? "#36B37E" : "#6B778C",
                      fontWeight: isCurrent ? 600 : 400,
                      maxWidth: "100px",
                    }}
                  >
                    {step.title}
                  </div>
                </div>

                {/* 接続線 */}
                {index < steps.length - 1 && (
                  <div
                    style={{
                      position: "absolute",
                      top: "20px",
                      left: "calc(50% + 20px)",
                      right: "calc(-50% + 20px)",
                      height: "2px",
                      background: isCompleted ? "#36B37E" : "#DFE1E6",
                      zIndex: 1,
                      transition: "background 0.3s ease",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ステップコンテンツ */}
      <div style={{ minHeight: "400px", marginBottom: "32px" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {currentStepData.description && (
              <div style={{ marginBottom: "24px" }}>
                <h3 style={{ fontSize: "18px", fontWeight: 600, color: "#172B4D", marginBottom: "8px" }}>
                  {currentStepData.title}
                </h3>
                <p style={{ fontSize: "14px", color: "#6B778C" }}>
                  {currentStepData.description}
                </p>
              </div>
            )}
            {currentStepData.component}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ナビゲーションボタン */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: "24px",
          borderTop: "1px solid #DFE1E6",
        }}
      >
        <Button
          appearance="subtle"
          onClick={handleBack}
          isDisabled={isFirstStep || !canGoBack || isLoading}
        >
          戻る
        </Button>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <Badge appearance="added">
            {currentStep + 1} / {steps.length}
          </Badge>
        </div>

        <Button
          appearance="primary"
          onClick={handleNext}
          isDisabled={!canGoNext || isLoading}
          isLoading={isLoading}
        >
          {isLastStep ? "完了" : "次へ"}
        </Button>
      </div>
    </div>
  );
}

