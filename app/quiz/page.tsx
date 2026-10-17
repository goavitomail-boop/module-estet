import { ProjectQuiz } from '@/components/project-quiz'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { JsonLd } from '@/components/json-ld'
import { breadcrumbJsonLd, pageMetadata, webPageJsonLd } from '@/lib/seo'

const title = 'Рассчитать проект кухни онлайн'
const description =
  'Пять простых вопросов о будущей кухне — около минуты. Дизайнер предложит идеи и расчёт бесплатно и ни к чему не обязывая.'
const path = '/quiz'

export const metadata = pageMetadata({ title, description, path })

export default function QuizPage() {
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
        <ProjectQuiz />
      </main>
      <SiteFooter />
    </>
  )
}
