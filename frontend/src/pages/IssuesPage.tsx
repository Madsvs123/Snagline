import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, Plus, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { errorMessage } from '../api/client'
import {
  bulkUpdateStatus,
  createSavedFilter,
  deleteSavedFilter,
  exportIssues,
  fetchAreas,
  fetchIssues,
  fetchProjects,
  fetchSavedFilters,
} from '../api/queries'
import type { IssueFilters, Status } from '../api/types'
import { IssueTable } from '../components/IssueTable'
import { PageHeader } from '../components/PageHeader'
import { QueryNotice } from '../components/QueryNotice'
import { SEVERITIES, STATUSES } from '../lib/constants'
import { useDebounced } from '../lib/useDebounced'

export function IssuesPage() {
  const [params] = useSearchParams()
  const query = params.toString()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState(params.get('status') ?? '')
  const [severity, setSeverity] = useState('')
  const [project, setProject] = useState(params.get('project') ?? '')
  const [area, setArea] = useState('')
  const [filterName, setFilterName] = useState('')
  const [savedId, setSavedId] = useState('')
  const [bulkStatus, setBulkStatus] = useState<Status>('in_progress')
  const [selected, setSelected] = useState<number[]>([])
  const [actionError, setActionError] = useState<string | null>(null)
  const debouncedSearch = useDebounced(search)
  const filters: IssueFilters = { search: debouncedSearch, status, severity, project, area }
  const projects = useQuery({ queryKey: ['projects'], queryFn: fetchProjects })
  const areas = useQuery({ queryKey: ['areas', project], queryFn: () => fetchAreas(project || undefined) })
  const saved = useQuery({ queryKey: ['saved-filters'], queryFn: fetchSavedFilters })
  const issues = useQuery({
    queryKey: ['issues', filters],
    queryFn: () => fetchIssues(filters),
  })

  useEffect(() => {
    const next = new URLSearchParams(query)
    setStatus(next.get('status') ?? '')
    setProject(next.get('project') ?? '')
  }, [query])

  useEffect(() => {
    setSelected([])
  }, [debouncedSearch, status, severity, project, area])

  const saveFilter = useMutation({
    mutationFn: () =>
      createSavedFilter({
        name: filterName.trim(),
        search,
        status,
        severity,
        project: project ? Number(project) : null,
        area: area ? Number(area) : null,
      }),
    onSuccess: async () => {
      setFilterName('')
      setActionError(null)
      await queryClient.invalidateQueries({ queryKey: ['saved-filters'] })
    },
    onError: (error) => setActionError(errorMessage(error)),
  })
  const removeFilter = useMutation({
    mutationFn: deleteSavedFilter,
    onSuccess: async () => {
      setSavedId('')
      await queryClient.invalidateQueries({ queryKey: ['saved-filters'] })
    },
  })
  const bulk = useMutation({
    mutationFn: () => bulkUpdateStatus(selected, bulkStatus),
    onSuccess: async () => {
      setSelected([])
      setActionError(null)
      await queryClient.invalidateQueries({ queryKey: ['issues'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
    onError: (error) => setActionError(errorMessage(error)),
  })
  const exporter = useMutation({
    mutationFn: () => exportIssues(filters),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'snagline-issues.csv'
      anchor.click()
      URL.revokeObjectURL(url)
      setActionError(null)
    },
    onError: (error) => setActionError(errorMessage(error)),
  })

  function applySaved(id: string) {
    setSavedId(id)
    const match = (saved.data ?? []).find((item) => String(item.id) === id)
    if (!match) return
    setSearch(match.search)
    setStatus(match.status)
    setSeverity(match.severity)
    setProject(match.project ? String(match.project) : '')
    setArea(match.area ? String(match.area) : '')
  }

  function toggleSelected(id: number, checked: boolean) {
    setSelected((current) => (checked ? [...current, id] : current.filter((item) => item !== id)))
  }

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
      <div className="toolbar">
        <label>
          Saved filter
          <select value={savedId} onChange={(event) => applySaved(event.target.value)}>
            <option value="">None</option>
            {(saved.data ?? []).map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <input
          value={filterName}
          onChange={(event) => setFilterName(event.target.value)}
          placeholder="Name this filter"
          aria-label="Saved filter name"
        />
        <button
          type="button"
          className="button button-ghost"
          disabled={filterName.trim().length < 2 || saveFilter.isPending}
          onClick={() => saveFilter.mutate()}
        >
          Save filter
        </button>
        <button
          type="button"
          className="button button-ghost"
          disabled={!savedId || removeFilter.isPending}
          onClick={() => removeFilter.mutate(Number(savedId))}
        >
          Delete filter
        </button>
        <button
          type="button"
          className="button button-ghost"
          disabled={exporter.isPending}
          onClick={() => exporter.mutate()}
        >
          <Download size={16} aria-hidden="true" />
          {exporter.isPending ? 'Exporting…' : 'Export CSV'}
        </button>
        <label>
          Bulk status
          <select value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value as Status)}>
            {STATUSES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="button button-ghost"
          disabled={selected.length === 0 || bulk.isPending}
          onClick={() => bulk.mutate()}
        >
          {bulk.isPending ? 'Updating…' : `Update ${selected.length} selected`}
        </button>
      </div>
      {actionError ? <p className="banner" role="alert">{actionError}</p> : null}
      {issues.data ? (
        <IssueTable issues={issues.data.results} selected={selected} onToggle={toggleSelected} />
      ) : (
        <QueryNotice isLoading={issues.isLoading} error={issues.error} />
      )}
    </>
  )
}
