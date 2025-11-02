"use client";

import { useState } from "react";

import type { ClinicProduct } from "@/generated/prisma/client";
import { api } from "@/trpc/react";
import { TRPCClientError } from "@trpc/client";

type FormState = {
  name: string;
  category: string;
  costPrice: string;
  sellingPrice: string;
  description: string;
  isActive: boolean;
};

const defaultFormState: FormState = {
  name: "",
  category: "",
  costPrice: "",
  sellingPrice: "",
  description: "",
  isActive: true,
};

const USER_ID_PLACEHOLDER = 1;

export function ProductManagement() {
  const utils = api.useUtils();
  const [form, setForm] = useState<FormState>(defaultFormState);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  const productsQuery = api.product.list.useQuery({ userId: USER_ID_PLACEHOLDER });

  const createMutation = api.product.create.useMutation({
    onSuccess: async () => {
      setFeedback({ type: "success", message: "商品を保存しました" });
      setForm(defaultFormState);
      await utils.product.list.invalidate({ userId: USER_ID_PLACEHOLDER });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error.message });
    },
  });

  const deleteMutation = api.product.delete.useMutation({
    onSuccess: async () => {
      setFeedback({ type: "success", message: "商品を削除しました" });
      await utils.product.list.invalidate({ userId: USER_ID_PLACEHOLDER });
    },
    onError: (error) => {
      setFeedback({ type: "error", message: error.message });
    },
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback({ type: null, message: "" });

    const costPrice = Number.parseInt(form.costPrice, 10);
    const sellingPrice = Number.parseInt(form.sellingPrice, 10);

    if (Number.isNaN(costPrice) || Number.isNaN(sellingPrice)) {
      setFeedback({ type: "error", message: "原価と販売価格は数値で入力してください" });
      return;
    }

    if (sellingPrice < costPrice) {
      setFeedback({
        type: "error",
        message: "販売価格は原価以上で入力してください",
      });
      return;
    }

    try {
      await createMutation.mutateAsync({
        userId: USER_ID_PLACEHOLDER,
        name: form.name.trim(),
        category: form.category.trim(),
        costPrice,
        sellingPrice,
        description: form.description.trim(),
        isActive: form.isActive,
      });
    } catch (error) {
      if (error instanceof TRPCClientError) {
        setFeedback({ type: "error", message: error.message });
      } else {
        setFeedback({ type: "error", message: "保存時にエラーが発生しました" });
      }
    }
  };

  const handleDelete = async (product: ClinicProduct) => {
    if (!window.confirm(`${product.name} を削除しますか？`)) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({
        id: product.id,
        userId: USER_ID_PLACEHOLDER,
      });
    } catch (error) {
      if (error instanceof TRPCClientError) {
        setFeedback({ type: "error", message: error.message });
      } else {
        setFeedback({ type: "error", message: "削除に失敗しました" });
      }
    }
  };

  const onInputChange = (
    field: keyof FormState,
    value: string | boolean,
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 py-12">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900">
          商品情報の入力
        </h1>
        <p className="text-sm text-zinc-600">
          クリニックで取り扱う商品・施術の原価と販売価格を登録してください。
        </p>
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-zinc-700">商品名 *</span>
              <input
                required
                value={form.name}
                onChange={(event) => onInputChange("name", event.target.value)}
                placeholder="例：ダーマペン4 全顔"
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-zinc-700">カテゴリ</span>
              <input
                value={form.category}
                onChange={(event) =>
                  onInputChange("category", event.target.value)
                }
                placeholder="例：美容皮膚科／美容内科"
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-zinc-700">原価 (円) *</span>
              <input
                required
                inputMode="numeric"
                value={form.costPrice}
                onChange={(event) =>
                  onInputChange("costPrice", event.target.value.replace(/[^0-9]/g, ""))
                }
                placeholder="例：12000"
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-zinc-700">販売価格 (円) *</span>
              <input
                required
                inputMode="numeric"
                value={form.sellingPrice}
                onChange={(event) =>
                  onInputChange(
                    "sellingPrice",
                    event.target.value.replace(/[^0-9]/g, ""),
                  )
                }
                placeholder="例：24800"
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </label>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-zinc-700">説明</span>
            <textarea
              value={form.description}
              onChange={(event) =>
                onInputChange("description", event.target.value)
              }
              rows={3}
              placeholder="施術内容や販売条件などを入力してください"
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => onInputChange("isActive", event.target.checked)}
              className="size-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-zinc-700">現在販売中</span>
          </label>

          {feedback.type && (
            <p
              className={`rounded-lg px-4 py-2 text-sm ${
                feedback.type === "success"
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {feedback.message}
            </p>
          )}

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {createMutation.isPending ? "保存中..." : "商品を保存"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">登録済み商品</h2>
          {productsQuery.isLoading && (
            <span className="text-xs text-zinc-500">読み込み中...</span>
          )}
        </div>

        {productsQuery.error && (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
            データの取得に失敗しました。リロードして再度お試しください。
          </p>
        )}

        {productsQuery.data && productsQuery.data.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600">
                    商品名
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600">
                    カテゴリ
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-zinc-600">
                    原価
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-zinc-600">
                    販売価格
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600">
                    ステータス
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {productsQuery.data.map((product) => (
                  <tr key={product.id}>
                    <td className="px-4 py-3 text-zinc-900">{product.name}</td>
                    <td className="px-4 py-3 text-zinc-600">
                      {product.category ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-600">
                      {product.costPrice.toLocaleString()}円
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-600">
                      {product.sellingPrice.toLocaleString()}円
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                          product.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-zinc-100 text-zinc-500"
                        }`}
                      >
                        {product.isActive ? "販売中" : "停止中"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(product)}
                        disabled={deleteMutation.isPending}
                        className="inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {!productsQuery.isLoading &&
          !productsQuery.error &&
          (!productsQuery.data || productsQuery.data.length === 0) && (
            <p className="mt-4 text-sm text-zinc-500">
              登録済みの商品はまだありません。
            </p>
          )}
      </section>
    </div>
  );
}

export default ProductManagement;

