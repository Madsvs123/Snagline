import { useQuery } from '@tanstack/react-query'
import { Plus, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { fetchAreas, fetchIssues, fetchProjects } from '../api/queries'
import { IssueTable } from '../components/IssueTable'
import { PageHeader } from '../components/PageHeader'
import { QueryNotice } from '../components/QueryNotice'
import { SEVERITIES, STATUSES } from '../lib/constants'
import { useDebounced } from '../lib/useDebounced'

export function IssuesPage() {
  const [params] = useSearchParams()
  const query = params.toString()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState(params.get('status') ?? '')
  const [severity, setSeverity] = useState('')
  const [project, setProject] = useState(params.get('project') ?? '')
  const [area, setArea] = useState('')
  const debouncedSearch = useDebounced(search)
  const projects = useQuery({ queryKey: ['projects'], queryFn: fetchProjects })
  const areas = useQuery({ queryKey: ['areas', project], queryFn: () => fetchAreas(project || undefined) })
  const issues = useQuery({
    queryKey: ['issues', { search: debouncedSearch, status, severity, project, area }],
    queryFn: () => fetchIssues({ search: debouncedSearch, status, severity, project, area }),
  })

  useEffect(() => {
    const next = new URLSearchParams(query)
    setStatus(next.get('status') ?? '')
    setProject(next.get('project') ?? '')
  }, [query])

  return (
    <>
      <PageHeader
        title="Issues"
        lede={issues.data ? `${issues.data.count} matching` : 'Search defects and tasks.'}
        action={
          <Link to="/issues/new" className="button button-primary">
            <Plus size={16} aria-hidden="true" />
            New issue
          </Link>
        }
      />
      <div className="filters">
        <label className="search">
          <Search size={16} aria-hidden="true" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search title and description"
            aria-label="Search issues"
          />
        </label>
        <label>
          Status
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">Any status</option>
            {STATUSES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Severity
          <select value={severity} onChange={(event) => setSeverity(event.target.value)}>
            <option value="">Any severity</option>
            {SEVERITIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Project
          <select
            value={project}
            onChange={(event) => {
              setProject(event.target.value)
              setArea('')
            }}
          >
            <option value="">All projects</option>
            {(projects.data ?? []).map((item) => (
              <option key={item.id} value={item.id}>
                {item.key} · {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Area
          <select value={area} onChange={(event) => setArea(event.target.value)}>
            <option value="">Any area</option>
            {(areas.data ?? []).map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {issues.data ? <IssueTable issues={issues.data.results} /> : <QueryNotice isLoading={issues.isLoading} error={issues.error} />}
    </>
  )
}
