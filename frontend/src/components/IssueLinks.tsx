import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { errorMessage } from '../api/client'
import { createIssueLink, deleteIssueLink, fetchIssueLinks, fetchIssues } from '../api/queries'
import type { Issue, IssueLink, IssueLinkKind } from '../api/types'

function otherSide(link: IssueLink, issueId: number) {
  const outgoing = link.source === issueId
  const otherId = outgoing ? link.target : link.source
  const otherKey = outgoing ? link.target_key : link.source_key
  const otherTitle = outgoing ? link.target_title : link.source_title
  let verb = 'Relates to'
  if (link.kind === 'blocks') {
    verb = outgoing ? 'Blocks' : 'Blocked by'
  }
  return { otherId, otherKey, otherTitle, verb }
}

export function IssueLinks({ issue }: { issue: Issue }) {
  const queryClient = useQueryClient()
  const [kind, setKind] = useState<IssueLinkKind>('blocks')
  const [target, setTarget] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const links = useQuery({
    queryKey: ['issue-links', issue.id],
    queryFn: () => fetchIssueLinks(issue.id),
  })
  const candidates = useQuery({
    queryKey: ['issues', { project: String(issue.project), for: 'links' }],
    queryFn: () => fetchIssues({ project: String(issue.project) }),
  })
  const add = useMutation({
    mutationFn: () => createIssueLink({ source: issue.id, target: Number(target), kind }),
    onSuccess: async () => {
      setTarget('')
      setFormError(null)
      await queryClient.invalidateQueries({ queryKey: ['issue-links', issue.id] })
      await queryClient.invalidateQueries({ queryKey: ['activity', issue.id] })
    },
    onError: (error) => setFormError(errorMessage(error)),
  })
  const remove = useMutation({
    mutationFn: deleteIssueLink,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['issue-links', issue.id] })
      await queryClient.invalidateQueries({ queryKey: ['activity', issue.id] })
    },
  })
  const choices = (candidates.data?.results ?? []).filter((item) => item.id !== issue.id)

  return (
    <article className="card stack">
      <h2>
        <Link2 size={18} aria-hidden="true" /> Links
      </h2>
      {(links.data ?? []).length === 0 ? <p className="muted">No linked issues yet.</p> : null}
      <ul className="comment-list">
        {(links.data ?? []).map((link) => {
          const other = otherSide(link, issue.id)
          return (
            <li key={link.id} className="comment">
              <header>
                <span>{other.verb}</span>
                <Link to={`/issues/${other.otherId}`} className="mono">
                  {other.otherKey}
                </Link>
                <span>{other.otherTitle}</span>
                <button type="button" className="text-button" onClick={() => remove.mutate(link.id)}>
                  Remove
                </button>
              </header>
            </li>
          )
        })}
      </ul>
      <form
        className="form-grid"
        onSubmit={(event) => {
          event.preventDefault()
          if (!target) {
            setFormError('Choose an issue to link.')
            return
          }
          add.mutate()
        }}
      >
        {formError ? <p className="banner wide" role="alert">{formError}</p> : null}
        <label className="field">
          <span>Relationship</span>
          <select value={kind} onChange={(event) => setKind(event.target.value as IssueLinkKind)}>
            <option value="blocks">Blocks</option>
            <option value="relates">Relates</option>
          </select>
        </label>
        <label className="field">
          <span>Issue</span>
          <select value={target} onChange={(event) => setTarget(event.target.value)}>
            <option value="">Choose an issue</option>
            {choices.map((item) => (
              <option key={item.id} value={item.id}>
                {item.project_key}-{item.number} · {item.title}
              </option>
            ))}
          </select>
        </label>
        <div className="wide">
          <button className="button button-ghost" type="submit" disabled={add.isPending || choices.length === 0}>
            {add.isPending ? 'Linking…' : 'Add link'}
          </button>
        </div>
      </form>
    </article>
  )
}
