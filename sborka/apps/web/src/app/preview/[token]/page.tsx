import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ADDONS, FEATURE_ADDONS } from "@/lib/addons";
import { isEditable } from "@/lib/http";
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
  searchParams: Promise<{ v?: string; intro?: string; edit?: string }>;
}) {
  const { token } = await params;
  const { v, intro, edit } = await searchParams;
  const order = await store.findOrderByToken(token);
  if (!order) notFound();
  const paid = order.status === "paid" || order.status === "published";
  // Платные фишки в редакторе можно убрать — кнопка покажет, сколько это сэкономит
  const addons = Object.fromEntries(order.addons.filter((a) => a.id in FEATURE_ADDONS).map((a) => [a.id, ADDONS[a.id].price]));
  return (
    <SiteRenderer
      spec={siteSpec(order, Number(v) || undefined)}
      mode={paid ? "example" : "preview"}
      intro={intro !== "0" && edit !== "1"}
      edit={edit === "1" && isEditable(order) ? { addons } : undefined}
    />
  );
}
