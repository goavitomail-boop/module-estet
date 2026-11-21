#!/usr/bin/env bash
# Регулярные задачи сайта для системного cron на сервере.
#
#   site-task.sh digest      сводка заявок менеджеру в MAX (с момента прошлой сводки)
#   site-task.sh reminders   напоминания «пора связаться» менеджеру в MAX
#   site-task.sh backup      резервная копия файлов сайта и базы
#
# vercel.json на своём сервере ничего не запускает — расписание живёт в crontab
# (docs/HANDOVER.md, раздел 4, «Регулярные задачи»). Пример для сервера в UTC:
# сводки в 09:00 и 19:00 по Москве, напоминания в 09:02, бэкап в 03:30
#   0 6 * * *  /var/www/ME/scripts/site-task.sh digest    >> /var/log/module-estet-tasks.log 2>&1
#   0 16 * * * /var/www/ME/scripts/site-task.sh digest    >> /var/log/module-estet-tasks.log 2>&1
#   2 6 * * *  /var/www/ME/scripts/site-task.sh reminders >> /var/log/module-estet-tasks.log 2>&1
#   30 3 * * * /var/www/ME/scripts/site-task.sh backup    >> /var/log/module-estet-tasks.log 2>&1
#
# Секреты в crontab не пишем: CRON_SECRET, DATABASE_URL и STORAGE_DIR скрипт
# читает из .env.local рабочего сайта. Папку сайта берёт из /etc/deploy-site.conf
# (SITE_DIR), как и deploy-site.
#
# Настройки бэкапа (в /etc/deploy-site.conf или в окружении):
#   BACKUP_DIR=/var/backups/module-estet   куда складывать архивы
#   BACKUP_KEEP_DAYS=14                    сколько дней хранить
#   BACKUP_REMOTE=yadisk:module-estet      куда ещё копировать через rclone
#                                          (необязательно; без копии вне сервера
#                                          бэкап не спасёт, если пропадёт сам сервер)

set -euo pipefail
umask 077

DEPLOY_CONF="${DEPLOY_CONF:-/etc/deploy-site.conf}"
if [ -f "$DEPLOY_CONF" ]; then
  # shellcheck disable=SC1090
  . "$DEPLOY_CONF"
fi

SITE_DIR="${SITE_DIR:-/var/www/html}"
SITE_DIR="${SITE_DIR%/}"
SITE_URL="${SITE_URL:-https://module-estet.ru}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/module-estet}"
BACKUP_KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
BACKUP_REMOTE="${BACKUP_REMOTE:-}"
ENV_FILE="$SITE_DIR/.env.local"

say() { printf '%s [%s] %s\n' "$(date '+%F %T')" "${TASK:-task}" "$*"; }
fail() { say "ОШИБКА: $*" >&2; exit 1; }

# Значение одной переменной из .env.local — без source: файл не исполняем,
# а кавычки вокруг значения снимаем
env_value() {
  [ -f "$ENV_FILE" ] || return 0
  local line
  line="$(grep -E "^[[:space:]]*$1=" "$ENV_FILE" | tail -n 1 || true)"
  line="${line#*=}"
  line="${line%$'\r'}"
  line="${line#\"}"; line="${line%\"}"
  line="${line#\'}"; line="${line%\'}"
  printf '%s' "$line"
}

call_cron() {
  local secret
  secret="$(env_value CRON_SECRET)"
  # Без секрета адрес открыт всем — не зовём его, пока защиты нет
  [ -n "$secret" ] || fail "в $ENV_FILE нет CRON_SECRET. Задайте его и перезапустите сайт: pm2 restart <имя> --update-env"
  local body
  body="$(curl -fsS --max-time 120 --retry 2 --retry-delay 20 \
    -H "Authorization: Bearer $secret" "$SITE_URL/api/cron/$1")" || fail "сайт не ответил на /api/cron/$1"
  say "готово: $body"
}

backup() {
  command -v tar >/dev/null || fail 'нет tar'
  mkdir -p "$BACKUP_DIR"
  # Два бэкапа одновременно (ручной и по расписанию) писали бы в один файл
  exec 8>"$BACKUP_DIR/.lock"
  flock -n 8 || fail 'бэкап уже идёт'

  local stamp storage database
  stamp="$(date +%F)"
  storage="$(env_value STORAGE_DIR)"
  storage="${storage%/}"
  database="$(env_value DATABASE_URL)"

  # 1. Файлы: заявки, планировки, договоры и фото кабинетов, портфолио, каталог
  if [ -n "$storage" ] && [ -d "$storage" ]; then
    tar -czf "$BACKUP_DIR/files-$stamp.tar.gz.part" -C "$(dirname "$storage")" "$(basename "$storage")"
    mv "$BACKUP_DIR/files-$stamp.tar.gz.part" "$BACKUP_DIR/files-$stamp.tar.gz"
    say "файлы: $BACKUP_DIR/files-$stamp.tar.gz ($(du -h "$BACKUP_DIR/files-$stamp.tar.gz" | cut -f1))"
  else
    say "файлы: STORAGE_DIR не задан или папки нет — пропускаю"
  fi

  # 2. База. pg_dump должен быть не старше версии Postgres в Neon:
  #    apt install -y postgresql-client (или postgresql-client-17)
  if [ -n "$database" ]; then
    if command -v pg_dump >/dev/null; then
      pg_dump "$database" --format=custom --no-owner --no-privileges --file "$BACKUP_DIR/db-$stamp.dump.part" \
        || fail 'pg_dump не смог выгрузить базу (версия клиента ниже версии сервера? см. pg_dump --version)'
      mv "$BACKUP_DIR/db-$stamp.dump.part" "$BACKUP_DIR/db-$stamp.dump"
      say "база: $BACKUP_DIR/db-$stamp.dump ($(du -h "$BACKUP_DIR/db-$stamp.dump" | cut -f1))"
    else
      say 'база: нет pg_dump — установите: apt install -y postgresql-client'
    fi
  fi

  # 3. Старые копии — прочь
  find "$BACKUP_DIR" -maxdepth 1 -type f \( -name 'files-*.tar.gz' -o -name 'db-*.dump' \) -mtime +"$BACKUP_KEEP_DAYS" -delete
  rm -f "$BACKUP_DIR"/*.part

  # 4. Копия вне сервера: без неё бэкап не переживёт потерю самого сервера
  if [ -n "$BACKUP_REMOTE" ]; then
    command -v rclone >/dev/null || fail 'BACKUP_REMOTE задан, но rclone не установлен: apt install -y rclone'
    rclone copy "$BACKUP_DIR" "$BACKUP_REMOTE" --include 'files-*.tar.gz' --include 'db-*.dump'
    rclone delete "$BACKUP_REMOTE" --min-age "${BACKUP_KEEP_DAYS}d" --include 'files-*.tar.gz' --include 'db-*.dump'
    say "копия отправлена в $BACKUP_REMOTE"
  else
    say 'копии вне сервера нет (BACKUP_REMOTE не задан)'
  fi
}

TASK="${1:-}"
case "$TASK" in
  digest|reminders) call_cron "$TASK" ;;
  backup) backup ;;
  *) echo "Использование: $0 digest|reminders|backup" >&2; exit 2 ;;
esac
