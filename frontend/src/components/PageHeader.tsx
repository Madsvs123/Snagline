import type { ReactNode } from 'react'

export function PageHeader({
  title,
  lede,
  action,
}: {
  title: string
  lede?: string
  action?: ReactNode
}) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {lede ? <p>{lede}</p> : null}
      </div>
      {action}
    </header>
  )
}
