import Link from 'next/link'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'selected'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-hover disabled:opacity-60',
  secondary: 'border border-line-strong bg-surface text-ink hover:bg-subtle disabled:text-faint',
  ghost: 'text-primary hover:bg-selected',
  selected: 'border border-primary bg-selected text-primary',
}

export function buttonClass(variant: Variant = 'primary', block = false) {
  return cn(
    'inline-flex min-h-tap items-center justify-center gap-2 rounded-control px-4 text-[15px] font-semibold transition-colors disabled:cursor-not-allowed',
    VARIANTS[variant],
    block && 'w-full',
  )
}

export function Button({ variant = 'primary', block, className, ...props }: { variant?: Variant; block?: boolean } & ComponentProps<'button'>) {
  return <button className={cn(buttonClass(variant, block), className)} {...props} />
}

export function ButtonLink({ variant = 'primary', block, className, ...props }: { variant?: Variant; block?: boolean } & ComponentProps<typeof Link>) {
  return <Link className={cn(buttonClass(variant, block), className)} {...props} />
}
