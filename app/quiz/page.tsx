import { QuizEntry } from '@/components/quiz-entry'
import type { QuizProduct } from '@/components/project-quiz'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { JsonLd } from '@/components/json-ld'
import { breadcrumbJsonLd, pageMetadata, webPageJsonLd } from '@/lib/seo'

const title = 'Рассчитать кухню или шкаф онлайн'
const description =
  'Несколько простых вопросов о будущей кухне или шкафе — около минуты. Дизайнер предложит идеи и расчёт бесплатно и ни к чему не обязывая.'
const path = '/quiz'

export const metadata = pageMetadata({ title, description, path })

export default async function QuizPage({ searchParams }: { searchParams: Promise<{ type?: string | string[] }> }) {
  // ?type=kitchen|wardrobe — сразу в нужный квиз, без экрана выбора
  const { type } = await searchParams
  const initialProduct: QuizProduct | null = type === 'kitchen' || type === 'wardrobe' ? type : null

  return (
    <>
      <JsonLd
        data={[
          webPageJsonLd({ name: title, description, path }),
          breadcrumbJsonLd([
            { name: 'Главная', path: '/' },
            { name: 'Расчёт проекта', path },
          ]),
        ]}
      />
      <SiteHeader />
      {/* «Чертёжная бумага» под анкетой — как светлые секции главной */}
      <main className="paper">
        <QuizEntry initialProduct={initialProduct} />
      </main>
      <SiteFooter />
    </>
  )
}
