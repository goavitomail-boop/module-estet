"use client";

import { useCallback, useState } from "react";

/** Запросы кабинета к API заказа: что сейчас выполняется и последняя ошибка. */
export function useOrderApi(token: string) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const call = useCallback(
    async <T = Record<string, unknown>>(action: string, path: string, body?: unknown): Promise<T | null> => {
      setBusy(action);
      setError("");
      try {
        const res = await fetch(`/api/orders/${token}/${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Не получилось выполнить действие");
        return data as T;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не получилось выполнить действие");
        return null;
      } finally {
        setBusy(null);
      }
    },
    [token],
  );

  return { busy, error, setError, call };
}

export type OrderApi = ReturnType<typeof useOrderApi>;
