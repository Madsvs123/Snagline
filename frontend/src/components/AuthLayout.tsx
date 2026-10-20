import type { ReactNode } from 'react'

export function AuthLayout({
  title,
  lede,
  children,
  footer,
}: {
  title: string
  lede: string
  children: ReactNode
  footer: ReactNode
}) {
  return (
    <main className="auth-layout">
      <section className="auth-hero">
        <p className="wordmark">Snag<span>line</span></p>
        <h1>Defects and tasks, kept in one place.</h1>
        <p>A tracker for the software you maintain yourself.</p>
        <ul>
          <li>Issues with status and severity</li>
          <li>Labels and milestones per project</li>
          <li>Comments and an activity trail</li>
        </ul>
      </section>
      <section className="auth-card">
        <h2>{title}</h2>
        <p>{lede}</p>
        {children}
        <p className="auth-footer">{footer}</p>
      </section>
    </main>
  )
}
