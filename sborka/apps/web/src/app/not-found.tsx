import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

export default function NotFound() {
  return (
    <>
      <PageHeader />
      <main className="container" style={{ padding: "96px 0", maxWidth: 640 }}>
        <h1 style={{ fontSize: "var(--fs-h2)", marginBottom: 16 }}>Такой страницы нет</h1>
        <p style={{ color: "var(--text-2)", marginBottom: 32 }}>
          Проверьте ссылку. Если это ссылка на кабинет, скопируйте её целиком из письма или сообщения.
        </p>
        <Link href="/" className="btn btn-primary">
          На главную
        </Link>
      </main>
    </>
  );
}
