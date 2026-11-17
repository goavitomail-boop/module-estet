import { cookies } from 'next/headers'

/**
 * Сообщение об успехе для экшена, который уводит на другую страницу.
 *
 * Форма к моменту перехода уже размонтирована и сказать «Удалено» не успевает,
 * поэтому сервер оставляет короткоживущую куку, а уведомления панели
 * (app/admin/_components/toast.tsx) читают её после перехода и стирают.
 * Кука не httpOnly намеренно: её читает браузер, секретов в ней нет.
 */
export async function flash(message: string) {
  ;(await cookies()).set('me_flash', message, { path: '/admin', maxAge: 30, sameSite: 'lax' })
}
