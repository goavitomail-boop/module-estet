import { randomUUID } from "node:crypto";
import { store, type Order } from "./store";

export const PRICE_KOPECKS = 499_900;

export interface CreatedPayment {
  id: string;
  /** Куда отправить клиента для оплаты. */
  confirmationUrl: string;
}

/**
 * Провайдер оплаты. Сейчас — заглушка: деньги не списываются,
 * клиент подтверждает «оплату» на тестовой странице.
 * ЮKassa реализует тот же интерфейс: createPayment создаёт платёж через API,
 * а подтверждение приходит вебхуком payment.succeeded.
 */
export interface PaymentProvider {
  readonly name: string;
  createPayment(order: Order): Promise<CreatedPayment>;
}

class StubPaymentProvider implements PaymentProvider {
  readonly name = "stub";

  async createPayment(order: Order): Promise<CreatedPayment> {
    const now = new Date().toISOString();
    const payment = await store.insertPayment(
      {
        id: randomUUID(),
        orderId: order.id,
        provider: this.name,
        amountKopecks: PRICE_KOPECKS,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      },
      order.token,
    );
    return { id: payment.id, confirmationUrl: `/pay/stub/${payment.id}` };
  }
}

export function getPaymentProvider(): PaymentProvider {
  const name = process.env.PAYMENT_PROVIDER ?? "stub";
  if (name === "stub") return new StubPaymentProvider();
  throw new Error(`Провайдер оплаты «${name}» ещё не подключён`);
}

export function formatRub(kopecks: number) {
  return `${(kopecks / 100).toLocaleString("ru-RU")} ₽`;
}
