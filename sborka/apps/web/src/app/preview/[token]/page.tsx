import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteSpecSchema } from "@/lib/sites/schema";
import { store } from "@/lib/store";
import { SiteRenderer } from "@/sites/SiteRenderer";

export const metadata: Metadata = { title: "Прототип", robots: { index: false, follow: false } };

export default async function PreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ v?: string }>;
}) {
  const { token } = await params;
  const { v } = await searchParams;
  const order = await store.findOrderByToken(token);
  if (!order) notFound();
  const n = Number(v) || order.currentVersion;
  const version = order.versions.find((x) => x.n === n) ?? order.versions.at(-1)!;
  const paid = order.status === "paid" || order.status === "published";
  return <SiteRenderer spec={SiteSpecSchema.parse(version.spec)} mode={paid ? "example" : "preview"} />;
}
