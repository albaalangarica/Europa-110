import { Fragment } from 'react'

const URL_RE = /(https?:\/\/[^\s<>"')]+)/
const IS_URL = /^https?:\/\//

/** Texto con saltos de línea respetados y enlaces http(s) pulsables. */
export function RichText({ text, className }: { text: string; className?: string }) {
  const paragraphs = String(text || '').split(/\r?\n/)
  return (
    <div className={className}>
      {paragraphs.map((line, i) =>
        line.trim() ? (
          <p key={i} className="mt-1.5 first:mt-0">
            {line.split(URL_RE).map((part, j) =>
              IS_URL.test(part) ? (
                <a key={j} href={part} target="_blank" rel="noopener noreferrer" className="break-all font-medium text-primary underline decoration-primary/30 underline-offset-2">
                  {part}
                </a>
              ) : (
                <Fragment key={j}>{part}</Fragment>
              ),
            )}
          </p>
        ) : null,
      )}
    </div>
  )
}
