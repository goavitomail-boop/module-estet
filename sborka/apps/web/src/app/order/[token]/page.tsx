import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { revisionsLeft, variantsLeft } from "@/lib/orders";
import { getPaymentProvider } from "@/lib/payments";
import { buildShow, describeStyle, tourSteps } from "@/lib/sites/presentation";
import { SiteSpecSchema } from "@/lib/sites/schema";
import { store } from "@/lib/store";
import { Cabinet } from "./Cabinet";

export const metadata: Metadata = { title: "Личный кабинет", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const { token } = await params;
  const { new: fresh } = await searchParams;
  const order = await store.findOrderByToken(token);
  if (!order) notFound();

  const versions = order.versions.map((v) => ({ ...v, spec: SiteSpecSchema.parse(v.spec) }));
  const current = versions.find((v) => v.n === order.currentVersion) ?? versions.at(-1)!;

  return (
    <>
      <PageHeader>{order.brief.businessName}</PageHeader>
      <main className="container">
        <Cabinet
          token={order.token}
          status={order.status}
          businessName={order.brief.businessName}
          versions={versions.map((v) => ({ n: v.n, createdAt: v.createdAt, reason: v.reason, style: describeStyle(v.spec) }))}
          currentVersion={current.n}
          revisions={order.revisions}
          variantsLeft={variantsLeft(order)}
          revisionsLeft={revisionsLeft(order)}
          testPayments={getPaymentProvider().name === "stub"}
          tour={tourSteps(current.spec, { aboutFromBrief: order.brief.about.trim().length > 0 })}
          show={fresh === "1" ? buildShow(current.spec, order.brief.services.length) : null}
        />
      </main>
    </>
  );
}
