import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

/**
 * Проверка кода: `pnpm lint`. Правила — официальные от Next.js
 * (Core Web Vitals и TypeScript).
 */
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Эти правила написаны под React Compiler, который в проекте не включён.
    // Они ругаются на рабочие приёмы (setState в эффекте при смене шага,
    // чтение ref при отрисовке), поэтому остаются подсказками, а не ошибками:
    // переписывать под них анимации и формы — риск сломать то, что работает.
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
    },
  },
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'public/**', 'tools/**']),
])
