"use client";

import { useState } from "react";
import s from "./pay.module.css";

export function StubPayment({ paymentId, cancelHref }: { paymentId: string; cancelHref: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function act(action: "succeed" | "cancel") {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/payments/stub/${paymentId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Не получилось обработать платёж");
      setBusy(false);
      return;
    }
    window.location.href = data.redirect ?? cancelHref;
  }

  return (
    <div className={s.actions}>
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
      <button type="button" className="btn btn-primary" disabled={busy} onClick={() => act("succeed")}>
        Оплатить
      </button>
      <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => act("cancel")}>
        Отменить оплату
      </button>
    </div>
  );
}
