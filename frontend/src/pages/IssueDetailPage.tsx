import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Activity, MessageSquare } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'

import { errorMessage } from '../api/client'
import {
  createComment,
  deleteComment,
  deleteIssue,
  fetchActivity,
  fetchComments,
  fetchIssue,
  fetchAreas,
  fetchMilestones,
  updateIssue,
} from '../api/queries'
import type { Severity, Status } from '../api/types'
import { SeverityBadge, StatusBadge } from '../components/Badge'
import { IssueLinks } from '../components/IssueLinks'
import { Field } from '../components/Field'
import { QueryNotice } from '../components/QueryNotice'
import { ACTIVITY_TEXT, SEVERITIES, STATUSES } from '../lib/constants'
import { exactTime, timeAgo } from '../lib/format'

const commentSchema = z.object({
  body: z.string().trim().min(1, 'Write a comment').max(8000),
})

type CommentValues = z.infer<typeof commentSchema>

export function IssueDetailPage() {
  const params = useParams()
  const id = Number(params.issueId)
  const validId = Number.isInteger(id) && id > 0
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [formError, setFormError] = useState<string | null>(null)
  const issueQuery = useQuery({
    queryKey: ['issue', id],
    queryFn: () => fetchIssue(id),
    enabled: validId,
  })
  const commentsQuery = useQuery({
    queryKey: ['comments', id],
    queryFn: () => fetchComments(id),
    enabled: validId,
  })
  const activityQuery = useQuery({
    queryKey: ['activity', id],
    queryFn: () => fetchActivity(id),
    enabled: validId,
  })
  const projectId = issueQuery.data?.project
  const milestones = useQuery({
    queryKey: ['milestones', projectId],
    queryFn: () => fetchMilestones(String(projectId)),
    enabled: projectId !== undefined,
  })
  const areas = useQuery({
    queryKey: ['areas', projectId],
    queryFn: () => fetchAreas(String(projectId)),
    enabled: projectId !== undefined,
  })
  const form = useForm<CommentValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: { body: '' },
  })

  async function refreshIssue() {
    await queryClient.invalidateQueries({ queryKey: ['issue', id] })
    await queryClient.invalidateQueries({ queryKey: ['issues'] })
    await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    await queryClient.invalidateQueries({ queryKey: ['activity', id] })
    await queryClient.invalidateQueries({ queryKey: ['projects'] })
    await queryClient.invalidateQueries({ queryKey: ['milestones'] })
  }

  const update = useMutation({
    mutationFn: (payload: { status?: Status; severity?: Severity; milestone?: number | null; area?: number | null }) =>
      updateIssue(id, payload),
    onSuccess: refreshIssue,
  })
  const comment = useMutation({
    mutationFn: (values: CommentValues) => createComment({ issue: id, body: values.body }),
    onSuccess: async () => {
      form.reset()
      setFormError(null)
      await queryClient.invalidateQueries({ queryKey: ['comments', id] })
      await refreshIssue()
    },
    onError: (error) => setFormError(errorMessage(error)),
  })
  const removeComment = useMutation({
    mutationFn: deleteComment,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['comments', id] })
      await refreshIssue()
    },
  })
  const removeIssue = useMutation({
    mutationFn: () => deleteIssue(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['issues'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      navigate('/issues')
    },
  })

  if (!validId) return <p className="error">That issue address is not valid.</p>
  if (!issueQuery.data) return <QueryNotice isLoading={issueQuery.isLoading} error={issueQuery.error} />

  const issue = issueQuery.data

  return (
    <>
      <p className="crumb">
        <Link to="/issues">Issues</Link>
        <span>/</span>
        <span className="mono">
          {issue.project_key}-{issue.number}
        </span>
      </p>
      <header className="page-header">
        <div>
          <h1>{issue.title}</h1>
          <p>
            Filed by {issue.reporter_name} · updated{' '}
            <time dateTime={issue.updated_at} title={exactTime(issue.updated_at)}>
              {timeAgo(issue.updated_at)}
            </time>
          </p>
        </div>
        <button
          type="button"
          className="button button-danger"
          onClick={() => {
            if (window.confirm('Delete this issue? Comments and activity go with it.')) {
              removeIssue.mutate()
            }
          }}
          disabled={removeIssue.isPending}
        >
          Delete
        </button>
      </header>
      <div className="issue-layout">
        <div className="stack">
          <article className="card">
            <div className="row">
              <StatusBadge status={issue.status} />
              <SeverityBadge severity={issue.severity} />
              <Link to={`/projects/${issue.project}`}>{issue.project_name}</Link>
              {issue.area_name ? <span className="muted">{issue.area_name}</span> : null}
              {issue.milestone_name ? <span className="muted">{issue.milestone_name}</span> : null}
            </div>
            <div className="chip-row">
              {issue.labels.map((label) => (
                <span key={label.id} className="chip" style={{ color: label.color, borderColor: label.color }}>
                  {label.name}
                </span>
              ))}
            </div>
            {issue.body ? <p className="prose">{issue.body}</p> : <p className="muted">No description yet.</p>}
          </article>
          <IssueLinks issue={issue} />
          <article className="card stack">
            <h2>
              <MessageSquare size={18} aria-hidden="true" /> Comments
            </h2>
            {(commentsQuery.data ?? []).length === 0 ? <p className="muted">No comments yet.</p> : null}
            <ul className="comment-list">
              {(commentsQuery.data ?? []).map((item) => (
                <li key={item.id} className="comment">
                  <header>
                    <strong>{item.author_name}</strong>
                    <time dateTime={item.created_at} title={exactTime(item.created_at)}>
                      {timeAgo(item.created_at)}
                    </time>
                    <button type="button" className="text-button" onClick={() => removeComment.mutate(item.id)}>
                      Delete
                    </button>
                  </header>
                  <p className="prose">{item.body}</p>
                </li>
              ))}
            </ul>
            <form
              className="stack"
              onSubmit={form.handleSubmit((values) => comment.mutate(values))}
              noValidate
            >
              {formError ? <p className="banner" role="alert">{formError}</p> : null}
              <Field label="Add a comment" error={form.formState.errors.body?.message}>
                <textarea placeholder="What did you find?" {...form.register('body')} />
              </Field>
              <button className="button button-primary" type="submit" disabled={comment.isPending}>
                {comment.isPending ? 'Saving…' : 'Comment'}
              </button>
            </form>
          </article>
        </div>
        <aside className="stack">
          <article className="card stack">
            <h2>Triage</h2>
            <label className="field">
              <span>Status</span>
              <select
                value={issue.status}
                onChange={(event) => update.mutate({ status: event.target.value as Status })}
                disabled={update.isPending}
              >
                {STATUSES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Severity</span>
              <select
                value={issue.severity}
                onChange={(event) => update.mutate({ severity: event.target.value as Severity })}
                disabled={update.isPending}
              >
                {SEVERITIES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Area</span>
              <select
                value={issue.area ?? ''}
                onChange={(event) => update.mutate({ area: event.target.value ? Number(event.target.value) : null })}
                disabled={update.isPending}
              >
                <option value="">No area</option>
                {(areas.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Milestone</span>
              <select
                value={issue.milestone ?? ''}
                onChange={(event) => update.mutate({ milestone: event.target.value ? Number(event.target.value) : null })}
                disabled={update.isPending}
              >
                <option value="">No milestone</option>
                {(milestones.data ?? []).map((milestone) => (
                  <option key={milestone.id} value={milestone.id}>
                    {milestone.name}
                  </option>
                ))}
              </select>
            </label>
          </article>
          <article className="card">
            <h2>
              <Activity size={18} aria-hidden="true" /> Activity
            </h2>
            {(activityQuery.data ?? []).length === 0 ? <p className="muted">No activity yet.</p> : null}
            <ul className="activity-list">
              {(activityQuery.data ?? []).map((item) => (
                <li key={item.id}>
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
          </article>
        </aside>
      </div>
    </>
  )
}
