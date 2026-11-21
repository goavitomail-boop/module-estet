'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ImageOff } from 'lucide-react'
import { cn } from '@/lib/utils'

type PortfolioImageProps = {
  src: string
  alt: string
  fill?: boolean
  sizes?: string
  priority?: boolean
  className?: string
}

export function PortfolioImage({ src, alt, fill = false, sizes, priority = false, className }: PortfolioImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  if (failedSrc === src) return <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted text-muted-foreground" role="img" aria-label={alt}><ImageOff className="size-6" aria-hidden="true" /><span className="text-sm">Фото недоступно</span></span>
  return <Image src={src} alt={alt} fill={fill} sizes={sizes} priority={priority} onError={() => setFailedSrc(src)} className={cn('object-cover', className)} />
}
