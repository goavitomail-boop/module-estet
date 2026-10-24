import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { revisionsLeft, variantsLeft } from "@/lib/orders";
import { getPaymentProvider } from "@/lib/payments";
import { store } from "@/lib/store";
import { Cabinet } from "./Cabinet";

export const metadata: Metadata = { title: "Личный кабинет", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function OrderPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const order = await store.findOrderByToken(token);
  if (!order) notFound();

  return (
    <>
      <PageHeader>{order.brief.businessName}</PageHeader>
      <main className="container">
        <Cabinet
          token={order.token}
          status={order.status}
          businessName={order.brief.businessName}
          versions={order.versions.map((v) => ({ n: v.n, createdAt: v.createdAt, reason: v.reason }))}
          currentVersion={order.currentVersion}
          revisions={order.revisions}
          variantsLeft={variantsLeft(order)}
          revisionsLeft={revisionsLeft(order)}
          testPayments={getPaymentProvider().name === "stub"}
        />
      </main>
    </>
  );
}
