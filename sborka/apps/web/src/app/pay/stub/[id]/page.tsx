import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { formatRub } from "@/lib/payments";
import { store } from "@/lib/store";
import { StubPayment } from "./StubPayment";
import s from "./pay.module.css";

export const metadata: Metadata = { title: "Тестовая оплата", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function StubPayPage({ params }: { params: Promise<{ id: string }> }) {
  if ((process.env.PAYMENT_PROVIDER ?? "stub") !== "stub") notFound();
  const { id } = await params;
  const payment = await store.findPayment(id);
  if (!payment) notFound();
  const order = (await store.listOrders()).find((o) => o.id === payment.orderId);
  if (!order) notFound();

  return (
    <>
      <PageHeader />
      <main className={`container ${s.main}`}>
        <div className={s.card}>
          <p className={s.badge}>Тестовая оплата</p>
          <h1 className={s.title}>{formatRub(payment.amountKopecks)}</h1>
          <p className={s.text}>
            Сайт для «{order.brief.businessName}». Это заглушка вместо платёжной системы: деньги не списываются.
            После подключения ЮKassa здесь будет форма оплаты картой и через СБП.
          </p>
          {payment.status === "pending" ? (
            <StubPayment paymentId={payment.id} cancelHref={`/order/${order.token}`} />
          ) : (
            <p className={s.text}>
              Платёж уже обработан. <a className="link" href={`/order/${order.token}`}>Вернуться в кабинет</a>
            </p>
          )}
        </div>
      </main>
    </>
  );
}
