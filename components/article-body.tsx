import Image from 'next/image'
import Link from 'next/link'
import { Fragment, type ReactNode } from 'react'
import type { ArticleBlock } from '@/lib/articles'

/** «Текст со [ссылкой](/адрес)» → текст и <Link> */
function inline(text: string): ReactNode[] {
  const parts: ReactNode[] = []
  const pattern = /\[([^\]]+)\]\(([^)]+)\)/g
  let last = 0
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0
    if (index > last) parts.push(text.slice(last, index))
    parts.push(
      <Link key={index} href={match[2]} className="font-medium text-primary underline-offset-4 hover:underline">
        {match[1]}
      </Link>
    )
    last = index + match[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

export function ArticleBody({ blocks }: { blocks: ArticleBlock[] }) {
  return (
    <div className="flex flex-col gap-6 text-lg leading-relaxed">
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'p':
            return <p key={i} className="text-pretty text-foreground/85">{inline(block.text)}</p>
          case 'h2':
            return (
              <h2 key={i} id={block.id} className="flyer-title mt-6 scroll-mt-28 text-balance text-3xl md:text-4xl">
                {block.text}
              </h2>
            )
          case 'list': {
            const List = block.ordered ? 'ol' : 'ul'
            return (
              <List key={i} className={block.ordered ? 'flex list-decimal flex-col gap-3 pl-6 marker:font-semibold marker:text-primary' : 'flex list-disc flex-col gap-3 pl-6 marker:text-primary'}>
                {block.items.map((item, j) => (
                  <li key={j} className="text-pretty pl-1 text-foreground/85">{inline(item)}</li>
                ))}
              </List>
            )
          }
          case 'image':
            return (
              <figure key={i} className="my-2 flex flex-col gap-3">
                <span className="relative block aspect-[4/3] overflow-hidden rounded-3xl bg-muted md:aspect-[16/9]">
                  <Image src={block.src} alt={block.alt} fill sizes="(max-width: 767px) 100vw, 768px" className="object-cover" />
                </span>
                {block.caption && <figcaption className="text-sm text-muted-foreground">{block.caption}</figcaption>}
              </figure>
            )
          case 'table':
            return (
              <div key={i} className="-mx-5 overflow-x-auto px-5 md:mx-0 md:px-0">
                <table className="w-full min-w-[34rem] border-collapse text-left text-base">
                  <thead>
                    <tr>
                      {block.head.map((cell) => (
                        <th key={cell} scope="col" className="border-b-2 border-foreground/80 py-3 pr-4 text-sm font-semibold uppercase tracking-wide">{cell}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, r) => (
                      <tr key={r} className="border-b border-border">
                        {row.map((cell, c) => (
                          <Fragment key={c}>
                            {c === 0 ? (
                              <th scope="row" className="py-3 pr-4 align-top font-semibold">{cell}</th>
                            ) : (
                              <td className="py-3 pr-4 align-top text-foreground/80">{cell}</td>
                            )}
                          </Fragment>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          case 'note':
            return (
              <aside key={i} className="rounded-2xl border-l-4 border-primary bg-secondary/60 px-5 py-4 text-base text-foreground/85">
                {inline(block.text)}
              </aside>
            )
        }
      })}
    </div>
  )
}
