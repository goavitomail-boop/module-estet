import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { ALWAYS, allNicheOptions } from "@/lib/sites/catalog";
import { NICHE_IDS, type NicheId } from "@/lib/sites/schema";
import { BriefForm } from "./BriefForm";

export const metadata: Metadata = { title: "Бриф" };

export default async function BriefPage({ searchParams }: { searchParams: Promise<{ niche?: string }> }) {
  const { niche } = await searchParams;
  const initial = NICHE_IDS.includes(niche as NicheId) ? (niche as NicheId) : undefined;
  return (
    <>
      <PageHeader>Оплата только после просмотра</PageHeader>
      <main className="container">
        <BriefForm initialNiche={initial} options={await allNicheOptions()} always={ALWAYS} />
      </main>
    </>
  );
}
