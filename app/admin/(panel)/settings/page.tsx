import { CheckCircle2, XCircle } from 'lucide-react'
import { getMaxBotInfo, adminUserIds } from '@/lib/max-bot'
import { databaseUrlSource, isDbConfigured, listBotUsers } from '@/lib/db'
import { isAuthConfigured, isPasswordHashed } from '@/lib/admin-auth'
import { MEASUREMENT_SLOTS, slotCapacity } from '@/lib/measurement-slots'
import { Panel } from '../../_components/ui'
import { TestNotificationButton } from './test-notification'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Настройки' }

export default async function SettingsPage() {
  const botInfo = process.env.MAX_BOT_TOKEN ? await getMaxBotInfo() : null
  const botName = (botInfo?.data as { name?: string; username?: string } | null)?.username ?? null
  const recipients = adminUserIds()
  const botUsers = isDbConfigured() ? await listBotUsers().catch(() => []) : []
  const capacity = slotCapacity()

  const checks = [
    {
      name: 'База данных',
      ok: isDbConfigured(),
      hint: isDbConfigured()
        ? `Заявки сохраняются, список и аналитика работают. Подключение взято из ${databaseUrlSource()}.`
        : 'Не задана ни одна из переменных DATABASE_URL / POSTGRES_URL. Заявки НЕ сохраняются — только отправляются в MAX.',
    },
    {
      name: 'Пароль панели',
      ok: isAuthConfigured() && isPasswordHashed(),
      hint: !isAuthConfigured()
        ? 'Не задан — панель недоступна.'
        : isPasswordHashed()
          ? 'Вход защищён, пароль хранится в виде scrypt-хеша.'
          : 'Пароль лежит открытым текстом в ADMIN_PASSWORD. Замените на ADMIN_PASSWORD_HASH.',
    },
    {
      name: 'Секрет сессии (ADMIN_SESSION_SECRET)',
      ok: Boolean(process.env.ADMIN_SESSION_SECRET),
      hint: process.env.ADMIN_SESSION_SECRET
        ? 'Куки подписываются отдельным секретом.'
        : 'Не задан — подпись куки завязана на пароль, и смена пароля разлогинит всех.',
    },
    {
      name: 'Бот MAX (MAX_BOT_TOKEN)',
      ok: Boolean(botInfo?.ok),
      hint: botInfo?.ok
        ? `Бот на связи${botName ? `: @${botName}` : ''}.`
        : process.env.MAX_BOT_TOKEN
          ? 'Токен задан, но API не отвечает.'
          : 'Не задан — уведомления о заявках не отправляются.',
    },
    {
      name: 'Получатели заявок (MAX_NOTIFY_USER_ID)',
      ok: recipients.length > 0,
      hint:
        recipients.length > 0
          ? `Заявки уходят ${recipients.length} ${recipients.length === 1 ? 'получателю' : 'получателям'}: ${recipients.join(', ')}`
          : 'Не задано — уведомления некуда отправлять.',
    },
    {
      name: 'Хранилище файлов (BLOB_READ_WRITE_TOKEN)',
      ok: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      hint: process.env.BLOB_READ_WRITE_TOKEN
        ? 'Фото и планы из квиза загружаются.'
        : 'Не задан — файлы из квиза не сохраняются, заявка придёт без вложений.',
    },
    {
      name: 'Секрет вебхука (MAX_WEBHOOK_SECRET)',
      ok: Boolean(process.env.MAX_WEBHOOK_SECRET),
      hint: process.env.MAX_WEBHOOK_SECRET
        ? 'Чужие запросы в вебхук отклоняются.'
        : 'Не задан — вебхук примет запрос от кого угодно.',
    },
  ]

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Настройки</h1>
        <p className="mt-1 text-sm text-muted-foreground">Состояние интеграций и диагностика</p>
      </header>

      <Panel title="Проверка конфигурации">
        <ul className="divide-y divide-border">
          {checks.map((check) => (
            <li key={check.name} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              {check.ok ? (
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-label="Настроено" />
              ) : (
                <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" aria-label="Не настроено" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium">{check.name}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{check.hint}</p>
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Запись на замер">
        <p className="text-sm">
          В один слот помещается <strong>{capacity}</strong>{' '}
          {capacity === 1 ? 'замер' : capacity < 5 ? 'замера' : 'замеров'} — это{' '}
          <strong>{capacity * MEASUREMENT_SLOTS.length}</strong> в день при трёх слотах.
        </p>
        <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
          {MEASUREMENT_SLOTS.map((slot) => (
            <li key={slot.value}>
              • {slot.label} — {slot.time}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted-foreground">
          Заполненные слоты форма на сайте показывает как «Занято» и не даёт на них записаться. Изменить норму —
          переменная <code className="rounded bg-secondary px-1 py-0.5 text-xs">MEASUREMENT_SLOT_CAPACITY</code>{' '}
          (по умолчанию 1). Отменённые заявки время не занимают.
        </p>
      </Panel>

      <Panel title="Уведомления в MAX">
        <p className="text-sm text-muted-foreground">
          Отправьте тестовое сообщение, чтобы убедиться, что заявки доходят до менеджеров.
        </p>
        <div className="mt-3">
          <TestNotificationButton />
        </div>
      </Panel>

      <Panel title="Кто писал боту">
        <p className="mb-4 text-sm text-muted-foreground">
          Чтобы человек начал получать заявки, он должен открыть бота, нажать «Начать» и написать ему. После этого его
          идентификатор появится здесь — добавьте его в переменную{' '}
          <code className="rounded bg-secondary px-1 py-0.5 text-xs">MAX_NOTIFY_USER_ID</code> через запятую.
        </p>

        {botUsers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Пока никто не писал боту.</p>
        ) : (
          <>
            {/* Телефон: карточки. Таблица на 420px уезжала за край экрана */}
            <ul className="space-y-2 sm:hidden">
              {botUsers.map((user) => (
                <li key={user.user_id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{user.name || 'Без имени'}</span>
                    {recipients.includes(user.user_id) ? (
                      <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        получает заявки
                      </span>
                    ) : (
                      <span className="shrink-0 text-xs text-muted-foreground">не получает</span>
                    )}
                  </div>
                  <p className="mt-1 select-all font-mono text-xs text-muted-foreground">{user.user_id}</p>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[420px] text-sm">
              <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="pb-2.5 font-medium">Имя</th>
                  <th className="pb-2.5 font-medium">user_id</th>
                  <th className="pb-2.5 font-medium">Получает заявки</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {botUsers.map((user) => (
                  <tr key={user.user_id}>
                    <td className="py-2.5">{user.name || '—'}</td>
                    <td className="py-2.5 font-mono text-xs">{user.user_id}</td>
                    <td className="py-2.5">
                      {recipients.includes(user.user_id) ? (
                        <span className="text-emerald-700">да</span>
                      ) : (
                        <span className="text-muted-foreground">нет</span>
                      )}
                    </td>
                  </tr>
                ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Panel>

      <Panel title="Переменные окружения">
        <p className="text-sm text-muted-foreground">
          Значения задаются в файле <code className="rounded bg-secondary px-1 py-0.5 text-xs">.env.local</code> при
          локальной работе и в разделе Settings → Environment Variables на хостинге. После изменения нужен
          перезапуск (локально) или редеплой (на хостинге).
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Панель намеренно не показывает и не редактирует сами значения — секреты не должны попадать в браузер.
        </p>
      </Panel>
    </div>
  )
}
