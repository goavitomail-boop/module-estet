import path from "node:path";

/** Папка с фото клиентов. Как и база, лежит в .data; перед запуском — объектное хранилище. */
export const UPLOADS_DIR = path.join(process.cwd(), ".data", "uploads");
