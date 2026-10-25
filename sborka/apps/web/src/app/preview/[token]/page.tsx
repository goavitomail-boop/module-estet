import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { siteSpec } from "@/lib/orders";
import { store } from "@/lib/store";
import { SiteRenderer } from "@/sites/SiteRenderer";

export const metadata: Metadata = { title: "Прототип", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ v?: string; intro?: string }>;
}) {
  const { token } = await params;
  const { v, intro } = await searchParams;
  const order = await store.findOrderByToken(token);
  if (!order) notFound();
  const paid = order.status === "paid" || order.status === "published";
  return <SiteRenderer spec={siteSpec(order, Number(v) || undefined)} mode={paid ? "example" : "preview"} intro={intro !== "0"} />;
}
