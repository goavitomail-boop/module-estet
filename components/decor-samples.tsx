'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import Image from 'next/image'
import './decor-samples.css'

/** Наклон образцов в стопке, градусы: лежат не идеально ровно, как настоящие */
const TILT = [-5, 3, -2, 6, -4, 2, -6, 4, -1, 5]

/**
 * Образцы декоров каркаса для карточки на главной: настоящие фото декоров
 * МДФ из каталога. Лежат стопкой и раскладываются в ряд — мышью по
 * наведению на карточку, пальцем — когда её долистали
 */
export function DecorSamples({ samples }: { samples: Array<{ name: string; image: string }> }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [seen, setSeen] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element || window.matchMedia('(hover: hover)').matches) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setSeen(true)
        observer.disconnect()
      },
      { threshold: 0.8 },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <span ref={ref} role="img" aria-label={`Декоры каркаса МДФ: ${samples.map((item) => item.name).join(', ')}`} className="ds" data-open={seen || undefined}>
      {samples.map((item, i) => (
        <span key={item.name} className="ds-chip" style={{ '--i': i, '--tilt': `${TILT[i % TILT.length]}deg`, zIndex: samples.length - i } as CSSProperties}>
          <Image src={item.image} alt="" fill sizes="28px" className="object-cover" />
        </span>
      ))}
    </span>
  )
}
