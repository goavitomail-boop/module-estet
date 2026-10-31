#!/usr/bin/env bash
# Выкатка сайта одной командой: код с GitHub → сборка рядом с рабочим сайтом →
# переключение папок → перезапуск pm2 → проверка, что сайт отвечает.
#
# Порядок тот же, что в docs/HANDOVER.md (раздел 2), только без архива и
# ручных шагов. Рабочий сайт не трогаем, пока новая версия не собралась.
#
#   deploy-site              выкатить свежую версию ветки
#   deploy-site --rollback   вернуть предыдущую версию (поменять папки обратно)
#
# Установка на сервер — один раз, см. docs/HANDOVER.md.

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/goavitomail-boop/module-estet.git}"
BRANCH="${BRANCH:-claude/ecstatic-pasteur-gr53pi}"
WWW="${WWW:-/var/www}"
PM2_APP="${PM2_APP:-nextjs-app}"
SITE_URL="${SITE_URL:-https://module-estet.ru}"
LIVE="$WWW/html"
NEXT="$WWW/html-old"

log() { printf '\n\033[1;33m==>\033[0m %s\n' "$*"; }
fail() { printf '\n\033[1;31mСтоп:\033[0m %s\n' "$*" >&2; exit 1; }

# Две выкатки одновременно перепутали бы папки
exec 9>"${TMPDIR:-/tmp}/module-estet-deploy.lock"
flock -n 9 || fail 'выкатка уже идёт в другом окне.'

for tool in git pnpm pm2 curl; do
  command -v "$tool" >/dev/null || fail "не найдена команда $tool."
done

swap() {
  cd "$WWW"
  mv html html-tmp && mv html-old html && mv html-tmp html-old
  # 9>&- — pm2 не должен унаследовать замок выкатки: если restart поднимет
  # фоновый процесс pm2 заново, тот держал бы замок, и следующая выкатка не запустилась бы
  pm2 restart "$PM2_APP" --update-env >/dev/null 9>&-
  pm2 save >/dev/null 9>&-
}

check() {
  # До 30 секунд: после перезапуска сайту нужно несколько секунд, чтобы подняться
  for _ in $(seq 1 15); do
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$SITE_URL/" || true)
    [ "$code" = 200 ] && return 0
    sleep 2
  done
  return 1
}

if [ "${1:-}" = '--rollback' ]; then
  [ -d "$NEXT" ] || fail "нет $NEXT — откатываться не на что."
  log 'Возвращаю предыдущую версию'
  swap
  check && log "Готово, сайт отвечает: $SITE_URL" || fail "сайт не ответил 200 — смотрите: pm2 logs $PM2_APP"
  exit 0
fi

[ -f "$LIVE/.env.local" ] || fail "нет $LIVE/.env.local — без него не будут работать заявки, панель и уведомления."

# 1. Код. Первый раз — клон ветки; дальше — только скачать изменения. node_modules
#    и кэш сборки в папке остаются (git clean без -x), поэтому установка быстрая
if [ -d "$NEXT/.git" ]; then
  log "Скачиваю свежий код ветки $BRANCH"
  git -C "$NEXT" fetch --depth 1 origin "$BRANCH"
  git -C "$NEXT" reset --hard FETCH_HEAD
  git -C "$NEXT" clean -fd
else
  log "Первая выкатка через git: клонирую $BRANCH в $NEXT"
  rm -rf "$NEXT"
  git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$NEXT"
fi
log "Версия: $(git -C "$NEXT" log -1 --format='%h  %s  (%cd)' --date=format:'%d.%m %H:%M')"

# 2. Настройки — те же, что у рабочего сайта
cp "$LIVE/.env.local" "$NEXT/.env.local"

# 3. Сборка. Рабочий сайт в это время работает; упадёт сборка — он не тронут
cd "$NEXT"
export NEXT_TELEMETRY_DISABLED=1 COREPACK_ENABLE_DOWNLOAD_PROMPT=0
log 'Ставлю зависимости'
pnpm install --frozen-lockfile
log 'Собираю сайт (несколько минут)'
pnpm build || fail 'сборка не прошла. Рабочий сайт не тронут.'

# 4. Переключение
log 'Переключаю на новую версию'
swap

# 5. Проверка
if check; then
  log "Готово, сайт отвечает: $SITE_URL"
else
  fail "сайт не ответил 200. Вернуть прошлую версию: deploy-site --rollback. Журнал: pm2 logs $PM2_APP"
fi

# Скрипт обновляет сам себя из репозитория. install пишет новый файл, а не
# правит текущий, — выполняющийся скрипт это не задевает
if [ -w /usr/local/bin ] && [ -f "$WWW/html/scripts/deploy.sh" ]; then
  install -m 755 "$WWW/html/scripts/deploy.sh" /usr/local/bin/deploy-site
fi
