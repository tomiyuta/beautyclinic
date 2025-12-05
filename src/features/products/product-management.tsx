"use client";

import { useState, useEffect } from "react";
import Button from "@atlaskit/button";
import TextField from "@atlaskit/textfield";
import Textarea from "@atlaskit/textarea";
import Checkbox from "@atlaskit/checkbox";
import Banner from "@atlaskit/banner";
import Badge from "@atlaskit/badge";
import Spinner from "@atlaskit/spinner";
import EmptyState from "@atlaskit/empty-state";
import type { ClinicProduct } from "@/generated/prisma/client";
import { api } from "@/trpc/react";
import { TRPCClientError } from "@trpc/client";
import { useToastContext } from "@/components/ToastProvider";
import { useConfirmModal } from "@/components/ConfirmModal";
import { SkeletonTable, SkeletonGrid } from "@/components/Skeleton";
import { ProductCard } from "@/components/ProductCard";
import { AnimatedTextField } from "@/components/AnimatedTextField";
import { USER_ID_PLACEHOLDER } from "@/lib/constants";
import { NumberInput } from "@/components/ui/NumberInput";
import { PriceSimulation } from "@/components/ui/PriceSimulation";

type FormState = {
  name: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  description: string;
  isActive: boolean;
};

const defaultFormState: FormState = {
  name: "",
  category: "",
  costPrice: 0,
  sellingPrice: 0,
  description: "",
  isActive: true,
};

export function ProductManagement() {
  const utils = api.useUtils();
  const toast = useToastContext();
  const confirmModal = useConfirmModal();
  const [form, setForm] = useState<FormState>(defaultFormState);
  const [viewMode, setViewMode] = useState<"table" | "card">("card");
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const productsQuery = api.product.list.useQuery(
    { userId: USER_ID_PLACEHOLDER },
    {
      retry: 1,
    }
  );

  // エラーハンドリング
  useEffect(() => {
    if (productsQuery.error) {
      console.error("商品データ取得エラー:", productsQuery.error);
    }
  }, [productsQuery.error]);

  const createMutation = api.product.create.useMutation({
    onSuccess: async () => {
      toast.showSuccess("商品を保存しました");
      setForm(defaultFormState);
      await utils.product.list.invalidate({ userId: USER_ID_PLACEHOLDER });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "エラーが発生しました";
      toast.showError(message);
    },
  });

  const deleteMutation = api.product.delete.useMutation({
    onSuccess: async () => {
      toast.showSuccess("商品を削除しました");
      await utils.product.list.invalidate({ userId: USER_ID_PLACEHOLDER });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "エラーが発生しました";
      toast.showError(message);
    },
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.costPrice || !form.sellingPrice) {
      toast.showError("原価と販売価格を入力してください");
      return;
    }

    if (form.sellingPrice < form.costPrice) {
      toast.showWarning("販売価格が原価を下回っています。本当に登録しますか？");
      // 警告は出すが、登録は継続
    }

    try {
      await createMutation.mutateAsync({
        userId: USER_ID_PLACEHOLDER,
        name: form.name.trim(),
        category: form.category.trim(),
        costPrice: form.costPrice,
        sellingPrice: form.sellingPrice,
        description: form.description.trim(),
        isActive: form.isActive,
      });
    } catch (error) {
      if (error instanceof TRPCClientError) {
        toast.showError(error.message);
      } else {
        toast.showError("保存時にエラーが発生しました");
      }
    }
  };

  const handleDelete = async (product: ClinicProduct) => {
    confirmModal.showConfirm(
      "商品の削除",
      `${product.name} を削除しますか？この操作は取り消せません。`,
      async () => {
        try {
          await deleteMutation.mutateAsync({
            id: product.id,
            userId: USER_ID_PLACEHOLDER,
          });
        } catch (error) {
          if (error instanceof TRPCClientError) {
            toast.showError(error.message);
          } else {
            toast.showError("削除に失敗しました");
          }
        }
      },
      {
        appearance: "danger",
        confirmLabel: "削除する",
        cancelLabel: "キャンセル",
      }
    );
  };

  const onInputChange = (
    field: keyof FormState,
    value: string | boolean | number,
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
    
    // リアルタイムバリデーション
    if (field === "costPrice" || field === "sellingPrice") {
      const numValue = typeof value === "number" ? value : 0;
      if (numValue < 0) {
        setErrors((prev) => ({ ...prev, [field]: "0以上の値を入力してください" }));
      } else {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
      
      // 販売価格と原価の比較（警告のみ、エラーにはしない）
      if (field === "sellingPrice" && form.costPrice) {
        if (numValue < form.costPrice) {
          // 警告はPriceSimulationコンポーネントで表示されるため、ここでは何もしない
        }
      }
    } else if (field === "name" && typeof value === "string" && value.trim().length === 0) {
      setErrors((prev) => ({ ...prev, name: "商品名は必須です" }));
    } else {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <>
      {confirmModal.Modal}
      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "48px 16px" }}>
      <header style={{ marginBottom: "40px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 600, marginBottom: "8px", color: "#172B4D" }}>
          商品情報の入力
        </h1>
        <p style={{ fontSize: "14px", color: "#6B778C" }}>
          クリニックで取り扱う商品・施術の原価と販売価格を登録してください。
        </p>
      </header>

      {/* 商品登録フォーム */}
      <section style={{ marginBottom: "32px", padding: "32px", background: "#FFFFFF", borderRadius: "8px", border: "1px solid #DFE1E6" }}>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(min(250px, 100%), 1fr))", 
            gap: "16px"
          }}>
            <AnimatedTextField
              label="商品名"
              value={form.name}
              onChange={(value) => onInputChange("name", value)}
              placeholder="例：ダーマペン4 全顔"
              required
              error={errors.name}
            />
            <AnimatedTextField
              label="カテゴリ"
              value={form.category}
              onChange={(value) => onInputChange("category", value)}
              placeholder="例：美容皮膚科／美容内科"
              error={errors.category}
            />
            <NumberInput
              label="原価 (円)"
              value={form.costPrice}
              onChange={(value) => onInputChange("costPrice", value)}
              placeholder="例：12000"
              required
              min={0}
            />
            <NumberInput
              label="販売価格 (円)"
              value={form.sellingPrice}
              onChange={(value) => onInputChange("sellingPrice", value)}
              placeholder="例：24800"
              required
              min={0}
            />
          </div>

          {/* 利益シミュレーション */}
          {(form.costPrice > 0 || form.sellingPrice > 0) && (
            <PriceSimulation
              costPrice={form.costPrice}
              sellingPrice={form.sellingPrice}
            />
          )}

          <div>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 500, color: "#42526E" }}>
              説明
            </label>
            <Textarea
              value={form.description}
              onChange={(e) => onInputChange("description", (e.target as HTMLTextAreaElement).value)}
              placeholder="施術内容や販売条件などを入力してください"
              minimumRows={3}
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <Checkbox
              isChecked={form.isActive}
              onChange={(e) => onInputChange("isActive", e.currentTarget.checked)}
              label="現在販売中"
            />
          </div>

          <Button
            type="submit"
            appearance="primary"
            isDisabled={createMutation.isPending}
          >
            {createMutation.isPending ? "保存中..." : "商品を保存"}
          </Button>
        </form>
      </section>

      {/* 登録済み商品一覧 */}
      <section style={{ padding: "24px", background: "#FFFFFF", borderRadius: "8px", border: "1px solid #DFE1E6" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#172B4D" }}>登録済み商品</h2>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ display: "flex", gap: "4px", border: "1px solid #DFE1E6", borderRadius: "4px", padding: "2px" }}>
              <Button
                appearance={viewMode === "table" ? "primary" : "subtle"}
                onClick={() => setViewMode("table")}
                style={{ minWidth: "auto", padding: "4px 12px" }}
              >
                📋
              </Button>
              <Button
                appearance={viewMode === "card" ? "primary" : "subtle"}
                onClick={() => setViewMode("card")}
                style={{ minWidth: "auto", padding: "4px 12px" }}
              >
                🎴
              </Button>
            </div>
            {productsQuery.isLoading && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Spinner size="small" />
                <span style={{ fontSize: "12px", color: "#6B778C" }}>読み込み中...</span>
              </div>
            )}
          </div>
        </div>

        {productsQuery.error && (
          <Banner appearance="error">
            <div>
              <div style={{ marginBottom: "8px", fontWeight: 600 }}>
                データの取得に失敗しました
              </div>
              <div style={{ fontSize: "12px", color: "#6B778C" }}>
                {productsQuery.error.message || "不明なエラーが発生しました"}
              </div>
              <div style={{ marginTop: "8px" }}>
                <Button
                  appearance="subtle"
                  onClick={() => productsQuery.refetch()}
                  size="small"
                >
                  再試行
                </Button>
              </div>
            </div>
          </Banner>
        )}

        {productsQuery.isLoading && (
          viewMode === "table" ? <SkeletonTable rows={5} /> : <SkeletonGrid count={6} />
        )}

        {!productsQuery.isLoading && productsQuery.data && productsQuery.data.length > 0 && (
          viewMode === "card" ? (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(300px, 100%), 1fr))",
              gap: "16px",
            }}>
              {productsQuery.data.map((product: ClinicProduct) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onDelete={handleDelete}
                  isDeleting={deleteMutation.isPending}
                />
              ))}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: "#F4F5F7" }}>
                  <tr>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "14px", fontWeight: 600, color: "#42526E", borderBottom: "1px solid #DFE1E6" }}>
                      商品名
                    </th>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "14px", fontWeight: 600, color: "#42526E", borderBottom: "1px solid #DFE1E6" }}>
                      カテゴリ
                    </th>
                    <th style={{ padding: "12px 16px", textAlign: "right", fontSize: "14px", fontWeight: 600, color: "#42526E", borderBottom: "1px solid #DFE1E6" }}>
                      原価
                    </th>
                    <th style={{ padding: "12px 16px", textAlign: "right", fontSize: "14px", fontWeight: 600, color: "#42526E", borderBottom: "1px solid #DFE1E6" }}>
                      販売価格
                    </th>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "14px", fontWeight: 600, color: "#42526E", borderBottom: "1px solid #DFE1E6" }}>
                      ステータス
                    </th>
                    <th style={{ padding: "12px 16px", borderBottom: "1px solid #DFE1E6" }} />
                  </tr>
                </thead>
                <tbody>
                  {productsQuery.data.map((product: ClinicProduct) => (
                    <tr key={product.id} style={{ borderBottom: "1px solid #DFE1E6" }}>
                      <td style={{ padding: "12px 16px", fontSize: "14px", color: "#172B4D" }}>
                        {product.name}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: "14px", color: "#42526E" }}>
                        {product.category ?? "-"}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontSize: "14px", color: "#42526E" }}>
                        {product.costPrice.toLocaleString()}円
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontSize: "14px", color: "#42526E" }}>
                        {product.sellingPrice.toLocaleString()}円
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <Badge appearance={product.isActive ? "added" : "removed"}>
                          {product.isActive ? "販売中" : "停止中"}
                        </Badge>
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <Button
                          appearance="subtle-link"
                          onClick={() => handleDelete(product)}
                          isDisabled={deleteMutation.isPending}
                        >
                          削除
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {!productsQuery.isLoading &&
          !productsQuery.error &&
          (!productsQuery.data || productsQuery.data.length === 0) && (
            <EmptyState
              header="登録済みの商品はまだありません"
              description="上記のフォームから商品を登録してください"
            />
          )}
      </section>
    </div>
    </>
  );
}

export default ProductManagement;
