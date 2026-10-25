import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { baseSpec, photoLibrary, revisionsLeft, siteSpec, variantsLeft } from "@/lib/orders";
import { getPaymentProvider } from "@/lib/payments";
import { ADDONS } from "@/lib/addons";
import { blockEffect, type EffectGroup } from "@/lib/sites/effects";
import { blockKeys } from "@/lib/sites/keys";
import { availableAddons, blockOptions } from "@/lib/sites/catalog";
import { buildShow, describeStyle, effectDefaults, tourSteps } from "@/lib/sites/presentation";
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

  const base = baseSpec(order);
  const spec = siteSpec(order);
  const feature = base.blocks.find((b) => b.type === "feature");
  const baseStyle = describeStyle(base);
  const { brief } = order;
  // Группы эффектов блоков, которые есть на сайте, и первый блок каждой — к нему подъехать после выбора
  const keys = blockKeys(spec.blocks);
  const effectBlocks: Partial<Record<EffectGroup, string>> = {};
  spec.blocks.forEach((b, i) => {
    const group = blockEffect(b);
    if (group && !effectBlocks[group]) effectBlocks[group] = keys[i];
  });

  return (
    <>
      <PageHeader>{brief.businessName}</PageHeader>
      <main className="container">
        <Cabinet
          token={order.token}
          status={order.status}
          businessName={brief.businessName}
          versions={order.versions.map((v) => ({ n: v.n, style: describeStyle(siteSpec(order, v.n)) }))}
          currentVersion={order.currentVersion}
          rev={order.rev}
          revisions={order.revisions}
          variantsLeft={variantsLeft(order)}
          revisionsLeft={revisionsLeft(order)}
          testPayments={getPaymentProvider().name === "stub"}
          tour={tourSteps(spec, { aboutFromBrief: brief.about.trim().length > 0 })}
          show={fresh === "1" ? buildShow(spec, brief.services.length) : null}
          addons={order.addons}
          available={availableAddons(feature?.type === "feature" ? feature.kind : undefined)}
          blocks={blockOptions(base)}
          edit={{
            businessName: brief.businessName,
            city: brief.city,
            about: brief.about,
            phone: brief.phone,
            address: brief.address,
            hours: brief.hours,
            services: brief.services,
            hero: { title: base.hero.title, subtitle: base.hero.subtitle, cta: base.hero.cta },
          }}
          custom={order.custom}
          leads={order.leads}
          wishes={order.wishes}
          canUndo={order.history.length > 0}
          library={photoLibrary(order)}
          defaults={{ accent: baseStyle.colors.accent, font: baseStyle.display, layout: baseStyle.layout }}
          effects={{
            current: spec.effects,
            defaults: effectDefaults(base),
            groups: Object.keys(effectBlocks) as EffectGroup[],
            blocks: effectBlocks,
            scenePrice: ADDONS.scene3d.price,
          }}
        />
      </main>
    </>
  );
}
