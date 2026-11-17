#!/usr/bin/env bash
# Выкатка сайта одной командой: код с GitHub → сборка рядом с рабочим сайтом →
# переключение папок → перезапуск pm2 → проверка, что сайт отвечает.
#
# Порядок тот же, что в docs/HANDOVER.md (раздел 2), только без архива и
# ручных шагов. Рабочий сайт не трогаем, пока новая версия не собралась.
#
#   deploy-site              показать, какие коммиты уйдут на сайт, спросить и выкатить
#   deploy-site --yes        то же без вопроса (для запуска из другого скрипта)
#   deploy-site --rollback   вернуть предыдущую версию (поменять папки обратно)
#
# Установка на сервер — один раз, см. docs/HANDOVER.md.
#
# Безопасность. Скрипт не слушает сеть и не запускается извне: выкатить может
# только тот, кто уже зашёл на сервер по SSH. Но он собирает и запускает код
# из ветки GitHub — значит, доступ к репозиторию равен доступу к серверу.
# Поэтому перед сборкой он показывает, какие коммиты и от кого уйдут на сайт,
# и ждёт подтверждения. Что ещё закрыть — docs/HANDOVER.md, раздел 2.

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

YES=0
case "${1:-}" in
  ''|--rollback) ;;
  -y|--yes) YES=1 ;;
  *) fail "неизвестный ключ «$1». Есть: --yes, --rollback" ;;
esac

# Две выкатки одновременно перепутали бы папки. Замок — в папке сайта,
# а не в /tmp: туда может писать любой пользователь сервера и подложить
# вместо файла ссылку, которую root потом перезапишет
[ -d "$WWW" ] || fail "нет папки $WWW."
exec 9>"$WWW/.deploy.lock"
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
#    и кэш сборки в папке остаются (git clean без -x), поэтому установка быстрая.
#    История — на 30 коммитов: по ней видно, что нового по сравнению с сайтом
if [ -d "$NEXT/.git" ]; then
  log "Скачиваю свежий код ветки $BRANCH"
  git -C "$NEXT" fetch --depth 30 origin "$BRANCH"
  git -C "$NEXT" reset --hard FETCH_HEAD
  git -C "$NEXT" clean -fd
else
  log "Первая выкатка через git: клонирую $BRANCH в $NEXT"
  rm -rf "$NEXT"
  git clone --depth 30 --branch "$BRANCH" "$REPO_URL" "$NEXT"
fi

# Что уйдёт на сайт. Чужой коммит в списке — повод остановиться: с ним
# на сервере выполнится чужой код
NEW_REV=$(git -C "$NEXT" rev-parse HEAD)
LIVE_REV=$(git -C "$LIVE" rev-parse HEAD 2>/dev/null || true)
FORMAT='  %h  %ad  %an  %s'
log 'Что попадёт на сайт'
if [ -n "$LIVE_REV" ] && [ "$LIVE_REV" = "$NEW_REV" ]; then
  echo '  ничего нового: на сайте уже эта версия, будет просто пересборка'
elif [ -n "$LIVE_REV" ] && git -C "$NEXT" cat-file -e "$LIVE_REV^{commit}" 2>/dev/null; then
  git -C "$NEXT" --no-pager log --format="$FORMAT" --date=format:'%d.%m %H:%M' "$LIVE_REV..HEAD"
else
  git -C "$NEXT" --no-pager log -1 --format="$FORMAT" --date=format:'%d.%m %H:%M' HEAD
  echo '  (версию на сайте в истории не нашёл — показан только последний коммит)'
fi

if [ "$YES" -ne 1 ]; then
  [ -t 0 ] || fail 'нет терминала, чтобы спросить. Без вопроса: deploy-site --yes'
  printf '\nВыкатить на %s? Проверьте, что все коммиты ваши. [y/N] ' "$SITE_URL"
  read -r answer || answer=''
  case "$answer" in
    y|Y|yes|д|Д|да|Да) ;;
    *) fail 'выкатка отменена, рабочий сайт не тронут.' ;;
  esac
fi

# 2. Настройки — те же, что у рабочего сайта. -p сохраняет права: в файле
#    пароли и токены, читать его должен только владелец
cp -p "$LIVE/.env.local" "$NEXT/.env.local"

# Хранилище файлов на сервере (STORAGE_DIR в .env.local): папка должна быть
# вне html и html-old — их выкатка меняет местами, и файлы бы «переезжали»
STORAGE_DIR_VALUE=$(grep -E '^STORAGE_DIR=' "$LIVE/.env.local" | tail -1 | cut -d= -f2- | tr -d "\"' " || true)
if [ -n "$STORAGE_DIR_VALUE" ]; then
  case "$STORAGE_DIR_VALUE" in
    "$LIVE"|"$LIVE"/*|"$NEXT"|"$NEXT"/*) fail "STORAGE_DIR=$STORAGE_DIR_VALUE внутри папки сайта — выкатка её подменит. Укажите, например, $WWW/storage." ;;
  esac
  mkdir -p "$STORAGE_DIR_VALUE"
  log "Файлы хранятся на сервере: $STORAGE_DIR_VALUE (свободно: $(df -h "$STORAGE_DIR_VALUE" | awk 'NR==2{print $4}'))"
fi

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
