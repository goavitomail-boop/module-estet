import { NextRequest, NextResponse } from 'next/server'
import { formatRussianPhone } from '@/lib/phone'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const phoneParam = searchParams.get('phone') || searchParams.get('tel') || ''
  const digits = phoneParam.replace(/\D/g, '')

  let cleanPhone = digits
  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
    cleanPhone = `+7${digits.slice(1)}`
  } else if (digits.length === 10) {
    cleanPhone = `+7${digits}`
  } else if (phoneParam.startsWith('+')) {
    cleanPhone = `+${digits}`
  } else if (digits) {
    cleanPhone = `+${digits}`
  }

  const telUrl = cleanPhone ? `tel:${cleanPhone}` : '/'
  const formatted = cleanPhone ? formatRussianPhone(cleanPhone) || cleanPhone : 'Номер не указан'

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <meta http-equiv="refresh" content="0;url=${telUrl}">
  <title>Звонок клиенту: ${formatted}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
    }
    .card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 20px;
      padding: 32px 24px;
      max-width: 400px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .icon {
      font-size: 40px;
      margin-bottom: 16px;
    }
    h1 {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    p {
      color: #94a3b8;
      font-size: 14px;
      margin-bottom: 24px;
    }
    .phone {
      font-size: 22px;
      font-weight: 700;
      color: #38bdf8;
      margin-bottom: 28px;
      letter-spacing: 0.5px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
      padding: 16px 24px;
      background: #0284c7;
      color: #ffffff;
      text-decoration: none;
      font-weight: 600;
      font-size: 16px;
      border-radius: 12px;
      transition: background 0.2s;
    }
    .btn:hover {
      background: #0369a1;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">📞</div>
    <h1>Соединение с клиентом</h1>
    <p>Если звонок не начался автоматически, нажмите на кнопку ниже:</p>
    <div class="phone">${formatted}</div>
    <a href="${telUrl}" class="btn">Позвонить ${formatted}</a>
  </div>
  <script>
    if ('${cleanPhone}') {
      window.location.href = "${telUrl}";
    }
  </script>
</body>
</html>`

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  })
}
