import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getGenerator } from "@/lib/sites/generator";
import { demoBrief, NICHES } from "@/lib/sites/niches";
import { NICHE_IDS, type NicheId } from "@/lib/sites/schema";
import { SiteRenderer } from "@/sites/SiteRenderer";
import s from "./example.module.css";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return NICHE_IDS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const niche = NICHES[slug as NicheId];
  return niche ? { title: `Пример сайта: ${niche.label}` } : {};
}

export default async function ExamplePage({ params }: Params) {
  const { slug } = await params;
  if (!NICHE_IDS.includes(slug as NicheId)) notFound();
  const spec = await getGenerator().generate({ brief: demoBrief(slug as NicheId), variant: 0 });

  return (
    <>
      <div className={s.bar}>
        <p>Пример сайта, собранного «Сборкой». Компания вымышленная.</p>
        <div className={s.actions}>
          <Link href="/#examples" className="link">
            Все примеры
          </Link>
          <Link href={`/brief?niche=${slug}`} className="btn btn-primary btn-small">
            Хочу такой же
          </Link>
        </div>
      </div>
      <SiteRenderer spec={spec} mode="example" />
    </>
  );
}
