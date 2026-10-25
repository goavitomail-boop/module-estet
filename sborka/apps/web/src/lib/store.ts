import { promises as fs } from "node:fs";
import path from "node:path";
import type { AddonSelection, Leads } from "./addons";
import { EMPTY_CUSTOM, type Custom } from "./sites/customize";
import type { Brief, SiteSpec } from "./sites/schema";

/**
 * Хранилище на JSON-файле для разработки и первых заказов.
 * Перед запуском в работу заменяется на PostgreSQL с тем же интерфейсом.
 */

export type OrderStatus = "ready" | "payment_pending" | "paid" | "published";

export interface SiteVersion {
  n: number;
  variant: number;
  spec: SiteSpec;
  createdAt: string;
  reason: "brief" | "variant";
}

export interface Revision {
  id: string;
  text: string;
  createdAt: string;
  status: "pending" | "done";
}

/** Запрос «не нашли нужное» — оцениваем вручную, не тратит бесплатные правки. */
export interface Wish {
  id: string;
  text: string;
  createdAt: string;
  status: "new" | "quoted";
}

export interface Order {
  id: string;
  /** Секретный токен из ссылки на кабинет. Пока это единственный способ входа. */
  token: string;
  createdAt: string;
  status: OrderStatus;
  brief: Brief;
  versions: SiteVersion[];
  currentVersion: number;
  revisions: Revision[];
  /** Настройки клиента поверх собранного сайта: скрытые блоки, тексты, команда, отзывы. */
  custom: Custom;
  /** Выбранные дополнения. */
  addons: AddonSelection[];
  /** Куда присылать заявки с сайта. */
  leads: Leads;
  wishes: Wish[];
  /** Фото, загруженные клиентом. */
  uploads: string[];
  /** Прошлые состояния для «Отменить»: ответы брифа и настройки, последние 20. */
  history: { brief: Brief; custom: Custom }[];
  /** Номер изменения: растёт при каждой правке, чтобы окно с прототипом обновилось. */
  rev: number;
  paymentId?: string;
}

export type PaymentStatus = "pending" | "succeeded" | "canceled";

export interface Payment {
  id: string;
  orderId: string;
  provider: string;
  amountKopecks: number;
  status: PaymentStatus;
  createdAt: string;
  updatedAt: string;
}

interface Db {
  orders: Order[];
  payments: Payment[];
}

const DB_FILE = path.join(process.cwd(), ".data", "db.json");

/** Заказы, созданные до появления дополнений, получают значения по умолчанию. */
function normalize(order: Order): Order {
  order.custom ??= structuredClone(EMPTY_CUSTOM);
  order.addons ??= [];
  order.leads ??= { channels: ["telegram"], email: "" };
  order.wishes ??= [];
  order.uploads ??= [];
  order.history ??= [];
  order.custom = { ...structuredClone(EMPTY_CUSTOM), ...order.custom };
  order.rev ??= 0;
  return order;
}

async function read(): Promise<Db> {
  try {
    const db = JSON.parse(await fs.readFile(DB_FILE, "utf8")) as Db;
    db.orders.forEach(normalize);
    return db;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return { orders: [], payments: [] };
    throw err;
  }
}

async function write(db: Db) {
  await fs.mkdir(path.dirname(DB_FILE), { recursive: true });
  const tmp = `${DB_FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2));
  await fs.rename(tmp, DB_FILE);
}

// Последовательная очередь изменений, чтобы параллельные запросы не затирали друг друга.
let queue: Promise<unknown> = Promise.resolve();

function mutate<T>(fn: (db: Db) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const db = await read();
    const result = await fn(db);
    await write(db);
    return result;
  });
  queue = run.catch(() => undefined);
  return run;
}

export const store = {
  async findOrderByToken(token: string) {
    const db = await read();
    return db.orders.find((o) => o.token === token) ?? null;
  },

  async listOrders() {
    const db = await read();
    return [...db.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  insertOrder(order: Order) {
    return mutate((db) => {
      db.orders.push(order);
      return order;
    });
  },

  /** Изменяет заказ по токену. Возвращает null, если заказа нет. */
  updateOrder(token: string, fn: (order: Order) => void) {
    return mutate((db) => {
      const order = db.orders.find((o) => o.token === token);
      if (!order) return null;
      fn(order);
      return order;
    });
  },

  async findPayment(id: string) {
    const db = await read();
    return db.payments.find((p) => p.id === id) ?? null;
  },

  insertPayment(payment: Payment, orderToken: string) {
    return mutate((db) => {
      db.payments.push(payment);
      const order = db.orders.find((o) => o.token === orderToken);
      if (order) {
        order.paymentId = payment.id;
        order.status = "payment_pending";
      }
      return payment;
    });
  },

  setPaymentStatus(id: string, status: PaymentStatus) {
    return mutate((db) => {
      const payment = db.payments.find((p) => p.id === id);
      if (!payment) return null;
      payment.status = status;
      payment.updatedAt = new Date().toISOString();
      const order = db.orders.find((o) => o.id === payment.orderId);
      if (order) {
        if (status === "succeeded") order.status = "paid";
        if (status === "canceled" && order.status === "payment_pending") order.status = "ready";
      }
      return { payment, order: order ?? null };
    });
  },
};
