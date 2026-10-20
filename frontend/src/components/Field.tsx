import clsx from 'clsx'
import type { ReactNode } from 'react'

export function Field({
  label,
  error,
  children,
  className,
}: {
  label: string
  error?: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={clsx('field', className)}>
      <span>{label}</span>
      {children}
      {error ? <em role="alert">{error}</em> : null}
    </label>
  )
}
