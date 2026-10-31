/**
 * Показывать ли заставку при заходе на сайт.
 *
 * Решает скрипт в <head> (app/layout.tsx) ещё до первой отрисовки: ставит
 * html[data-preloader="active"], и CSS сразу закрывает страницу тёмным
 * экраном. Если ждать, пока React оживит страницу, посетитель успевает
 * секунду видеть сайт, а потом его закрывает заставка.
 *
 * Компонент прелоадера (components/site-preloader.tsx) берёт это решение
 * у атрибута, а сам только отмечает показ — ключи общие, поэтому здесь.
 */

export const PRELOADER_SESSION_KEY = 'modul-estet-preloader-fonts-v4'
/** Отметка в localStorage: переживает закрытие вкладки, в отличие от сессии */
export const PRELOADER_SEEN_KEY = 'modul-estet-preloader-seen-at'
/**
 * Сколько заставка не повторяется. Двенадцать часов закрывают день: за один
 * визит, сколько бы вкладок ни открыли, заставка покажется один раз
 */
export const PRELOADER_SEEN_WINDOW_MS = 12 * 60 * 60 * 1000

/**
 * Лист чертежа в заставке: viewBox в миллиметрах (x, y, ширина, высота) и
 * размер листа на экране — те же числа, что в .vp__sheet в app/globals.css
 */
export const PLAN_VIEWBOX = [-600, -480, 4800, 3640] as const
const SHEET = { vw: 0.88, vh: 0.6, max: 1100 }

/** Сколько миллиметров чертежа приходится на пиксель экрана — чтобы линии были толщиной в пиксель */
export function planUnitsPerPx(width: number, height: number): number {
  const [, , w, h] = PLAN_VIEWBOX
  const sheet = Math.min(width * SHEET.vw, (height * SHEET.vh * w) / h, SHEET.max)
  return w / Math.max(1, sheet)
}

/**
 * Скрипт для <head>. Строкой, потому что выполняется до загрузки бандлов;
 * ключи подставляются из констант выше, чтобы не разойтись с компонентом.
 * ?preloader в адресе — показать ещё раз, например чтобы оценить заставку.
 * В панели (/admin) заставки нет вовсе.
 *
 * Поисковым роботам и проверкам скорости заставку не показываем: пока она
 * идёт, содержимое страницы скрыто, и робот снял бы пустой экран вместо сайта
 *
 * Людям из поиска и с рекламы — тоже. Они пришли с конкретным вопросом, и
 * одиннадцать секунд заставки вместо ответа уводят их обратно в выдачу.
 * Для Яндекса такой возврат — сигнал, что страница не ответила на запрос,
 * а рекламный клик оплачен впустую. Заставку видят те, кто пришёл напрямую
 */
const SEARCH_REFERRER = '^https?:\\/\\/([^\\/]+\\.)?(yandex\\.|ya\\.ru|google\\.|bing\\.com|go\\.mail\\.ru|duckduckgo\\.com|rambler\\.ru|search\\.yahoo\\.)'
const AD_PARAMS = '[?&](utm_[a-z]+|yclid|ysclid|gclid|fbclid)='
const BOT_PATTERN = 'bot|crawl|spider|slurp|lighthouse|inspectiontool|headless|yandeximages|yandexmetrika|yandexwebmaster|bingpreview|facebookexternalhit|telegram|whatsapp|vkshare'

export const preloaderFlagScript = `(function(){try{var l=location;if(l.pathname.indexOf('/admin')===0)return;if(/${BOT_PATTERN}/i.test(navigator.userAgent||''))return;var due=true;if(!/[?&]preloader(=|&|$)/.test(l.search)){if(/${SEARCH_REFERRER}/i.test(document.referrer||'')||/${AD_PARAMS}/i.test(l.search))due=false;try{if(sessionStorage.getItem(${JSON.stringify(PRELOADER_SESSION_KEY)}))due=false}catch(e){}if(due){try{var at=Number(localStorage.getItem(${JSON.stringify(PRELOADER_SEEN_KEY)}));if(at>0&&Date.now()-at<${PRELOADER_SEEN_WINDOW_MS})due=false}catch(e){}}}if(due){var d=document.documentElement;d.dataset.preloader='active';var s=Math.min(innerWidth*${SHEET.vw},innerHeight*${SHEET.vh}*${PLAN_VIEWBOX[2]}/${PLAN_VIEWBOX[3]},${SHEET.max});d.style.setProperty('--vp-u',(${PLAN_VIEWBOX[2]}/Math.max(1,s)).toFixed(3))}}catch(e){}})()`

export function markPreloaderShown(): void {
  try {
    window.sessionStorage.setItem(PRELOADER_SESSION_KEY, 'true')
  } catch {
    // Приватный режим: заставка просто покажется ещё раз
  }
  try {
    window.localStorage.setItem(PRELOADER_SEEN_KEY, String(Date.now()))
  } catch {
    // То же самое
  }
}
