import type { Severity, Status } from '../api/types'

export const STATUSES: { value: Status; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

export const SEVERITIES: { value: Severity; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]

export const ACTIVITY_TEXT: Record<string, string> = {
  created: 'opened the issue',
  commented: 'added a comment',
  comment_edited: 'edited a comment',
  status_changed: 'changed status',
  severity_changed: 'changed severity',
  title_changed: 'renamed the issue',
  description_changed: 'updated the description',
  milestone_changed: 'changed the milestone',
  area_changed: 'changed the area',
  labels_changed: 'changed labels',
  linked: 'linked an issue',
  unlinked: 'removed a link',
}
