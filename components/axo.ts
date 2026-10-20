/**
 * Чертёж в аксонометрии — общий для схем «Наполнения» (filling-scene.tsx)
 * и шкафа (wardrobe-inside.tsx, wardrobe-heights.tsx): смотрим спереди,
 * справа и чуть сверху.
 *
 * Размеры — в миллиметрах. Ось x — вдоль фасадов слева направо, y — вверх
 * от пола, z — вглубь от плоскости фасадов. Выдвинуть что-то к зрителю —
 * значит сдвинуть по z в минус.
 */

/** Миллиметр на чертеже до вписывания в кадр */
export const K = 0.26

export type Pt = [number, number]
export type Range = [number, number]

const fmt = ([a, b]: Pt) => `${a.toFixed(1)},${b.toFixed(1)}`
export const path = (pts: Pt[]) => 'M' + pts.map(fmt).join('L') + 'Z'
export const line = (pts: Pt[]) => 'M' + pts.map(fmt).join('L')

const deg = (value: number) => (value * Math.PI) / 180

/**
 * Ракурс: под каким углом и насколько укороченными уходят на экране фасады
 * (вправо-вниз) и глубина (к зрителю — влево-вниз). Возвращает проекцию
 * точки и грани в этом ракурсе
 */
export function axonometry(axis: { deg: number; scale: number }, depth: { deg: number; scale: number }) {
  const AX = { cos: Math.cos(deg(axis.deg)) * axis.scale, sin: Math.sin(deg(axis.deg)) * axis.scale }
  const OUT = { cos: Math.cos(deg(depth.deg)) * depth.scale, sin: Math.sin(deg(depth.deg)) * depth.scale }
  const P = (x: number, y: number, z: number): Pt => [K * (x * AX.cos + z * OUT.cos), K * (x * AX.sin - z * OUT.sin - y)]
  const face = (pts: Array<[number, number, number]>) => path(pts.map(([x, y, z]) => P(x, y, z)))
  return {
    P,
    /** Наклон на экране линий вдоль фасадов и вглубь, градусы — по ним пишутся размеры */
    AX_ANGLE: (Math.atan2(AX.sin, AX.cos) * 180) / Math.PI,
    DEPTH_ANGLE: -(Math.atan2(OUT.sin, OUT.cos) * 180) / Math.PI,
    /** Грани: фасадная (z = const), верхняя (y = const), правая боковая (x = const) */
    front: (x: Range, y: Range, z: number) => face([[x[0], y[0], z], [x[1], y[0], z], [x[1], y[1], z], [x[0], y[1], z]]),
    top: (x: Range, y: number, z: Range) => face([[x[0], y, z[0]], [x[1], y, z[0]], [x[1], y, z[1]], [x[0], y, z[1]]]),
    side: (x: number, y: Range, z: Range) => face([[x, y[0], z[0]], [x, y[0], z[1]], [x, y[1], z[1]], [x, y[1], z[0]]]),
    /** Сдвиг к зрителю на travel миллиметров — для CSS transform, в единицах чертежа */
    pullOut: (travel: number) => `translate(${(-K * travel * OUT.cos).toFixed(1)}px, ${(K * travel * OUT.sin).toFixed(1)}px)`,
    /**
     * Проём, протянутый к зрителю на ход: всё, что выдвинутое показывает перед
     * фасадами, лежит в этой фигуре. Что глубже — видно только сквозь сам
     * проём, остальное закрывает корпус. Обрезка по ней — clipPath
     */
    sweptOpening: (x: Range, y: Range, z: number, travel: number) => {
      const corners = (zz: number) => [P(x[0], y[0], zz), P(x[1], y[0], zz), P(x[1], y[1], zz), P(x[0], y[1], zz)]
      return path(hull([...corners(z), ...corners(z - travel)]))
    },
  }
}

/**
 * Ракурс схем «Наполнения»: фасады под 32° и укорочены, глубина под 22° —
 * смотрим скорее сбоку, чтобы выехавший модуль было видно во всю глубину
 */
export const { P, AX_ANGLE, front, top, side, pullOut, sweptOpening } = axonometry({ deg: 32, scale: 0.78 }, { deg: 22, scale: 0.95 })

/**
 * Ракурс шкафа (wardrobe-inside.tsx, wardrobe-heights.tsx): почти спереди,
 * глубина короткая — шкаф смотрят внутрь и по высоте, секции должно быть
 * видно целиком
 */
export const wardrobeView = axonometry({ deg: 12, scale: 0.95 }, { deg: 35, scale: 0.5 })

/** Выпуклая оболочка точек (монотонная цепь) */
export function hull(points: Pt[]): Pt[] {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const half = (list: Pt[]) => {
    const out: Pt[] = []
    for (const p of list) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop()
      out.push(p)
    }
    out.pop()
    return out
  }
  return [...half(pts), ...half([...pts].reverse())]
}

/**
 * Силуэт, который рисуется прямо, без перекоса осей: круглое со всех сторон
 * выглядит одинаково. Точки [dx, dy] — в миллиметрах от середины основания,
 * dy — вверх
 */
export function shape(base: Pt, pts: Array<[number, number]>) {
  return path(pts.map(([dx, dy]) => [base[0] + dx * K, base[1] - dy * K] as Pt))
}

/** Вписать чертёж в кадр по крайним точкам: масштаб и сдвиг для корневой группы */
export function fitTo(points: Pt[], view: { w: number; h: number }, pad: { x: number; top: number; bottom: number }) {
  const xs = points.map((p) => p[0])
  const ys = points.map((p) => p[1])
  const box = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }
  const fit = Math.min((view.w - pad.x * 2) / box.w, (view.h - pad.top - pad.bottom) / box.h)
  return {
    fit,
    tx: (view.w - box.w * fit) / 2 - box.x * fit,
    ty: pad.top + (view.h - pad.top - pad.bottom - box.h * fit) / 2 - box.y * fit,
  }
}

export const INK = 'color-mix(in oklab, var(--foreground) 72%, transparent)'
export const FAINT = 'color-mix(in oklab, var(--foreground) 30%, transparent)'
export const BRASS = 'var(--primary)'
export const FACE = 'var(--card)'
export const SHADE = 'color-mix(in oklab, var(--foreground) 7%, var(--card))'
export const SHADE_DEEP = 'color-mix(in oklab, var(--foreground) 14%, var(--card))'
export const INSIDE = 'color-mix(in oklab, var(--foreground) 78%, var(--card))'
