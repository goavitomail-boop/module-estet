import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

export function LegalStub({ title }: { title: string }) {
  return (
    <>
      <PageHeader />
      <main className="container" style={{ padding: "64px 0 96px", maxWidth: 720 }}>
        <h1 style={{ fontSize: "var(--fs-h2)", marginBottom: 24 }}>{title}</h1>
        <p style={{ color: "var(--text-2)", marginBottom: 24 }}>
          <span className="todo">Документ готовится. Текст нужно подготовить с юристом до приёма оплат.</span>
        </p>
        <Link href="/" className="link">
          На главную
        </Link>
      </main>
    </>
  );
}
