import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import type { Severity } from '../api/types'
import { fetchDashboard } from '../api/queries'
import { IssueTable } from '../components/IssueTable'
import { PageHeader } from '../components/PageHeader'
import { QueryNotice } from '../components/QueryNotice'
import { ACTIVITY_TEXT } from '../lib/constants'
import { exactTime, timeAgo } from '../lib/format'

const SEVERITY_FILL: Record<Severity, string> = {
  low: '#5f6b57',
  medium: '#c4922a',
  high: '#c4532a',
  critical: '#8c2f39',
}

export function DashboardPage() {
  const dashboard = useQuery({ queryKey: ['dashboard'], queryFn: fetchDashboard })

  if (!dashboard.data) {
    return <QueryNotice isLoading={dashboard.isLoading} error={dashboard.error} />
  }

  const data = dashboard.data
  const cards = [
    { key: 'open' as const, label: 'Open', value: data.counts.open },
    { key: 'in_progress' as const, label: 'In progress', value: data.counts.in_progress },
    { key: 'resolved' as const, label: 'Resolved', value: data.counts.resolved },
    { key: 'closed' as const, label: 'Closed', value: data.counts.closed },
  ]
  const noun = data.counts.total === 1 ? 'issue' : 'issues'

  return (
    <>
      <PageHeader
        title="Dashboard"
        lede={`${data.counts.total} ${noun} across your projects.`}
        action={
          <Link to="/issues/new" className="button button-primary">
            <Plus size={16} aria-hidden="true" />
            File issue
          </Link>
        }
      />
      <section className="stats">
        {cards.map((card) => (
          <Link key={card.key} to={`/issues?status=${card.key}`} className="stat">
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </Link>
        ))}
      </section>
      <section className="split">
        <article className="card">
          <h2>Issues by severity</h2>
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.by_severity} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4dccb" />
                <XAxis dataKey="label" tick={{ fill: '#4a433a', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} width={32} tick={{ fill: '#4a433a', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'rgba(28, 25, 21, 0.04)' }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} minPointSize={3}>
                  {data.by_severity.map((entry) => (
                    <Cell key={entry.severity} fill={SEVERITY_FILL[entry.severity]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
        <article className="card">
          <h2>Recent activity</h2>
          {data.recent_activity.length === 0 ? (
            <p className="empty">Activity shows up when you file an issue, comment, or change status.</p>
          ) : (
            <ul className="activity-list">
              {data.recent_activity.map((item) => (
                <li key={item.id}>
                  <Link to={`/issues/${item.issue}`} className="mono">
                    {item.project_key}-{item.issue_number}
                  </Link>
                  <span>
                    {item.actor_name} {ACTIVITY_TEXT[item.kind] ?? item.kind}
                  </span>
                  {item.detail ? <span className="muted">{item.detail}</span> : null}
                  <time dateTime={item.created_at} title={exactTime(item.created_at)}>
                    {timeAgo(item.created_at)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
      <section className="card">
        <h2>Recently updated</h2>
        {data.recent_issues.length === 0 ? (
          <p className="empty">
            No defects yet. <Link to="/issues/new">File the first issue</Link>.
          </p>
        ) : (
          <IssueTable issues={data.recent_issues} />
        )}
      </section>
    </>
  )
}
