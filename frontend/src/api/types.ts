export type Status = 'open' | 'in_progress' | 'resolved' | 'closed'
export type Severity = 'low' | 'medium' | 'high' | 'critical'

export type Page<T> = {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export type AuthResponse = {
  access: string
  refresh: string
  username: string
}

export type Project = {
  id: number
  name: string
  key: string
  description: string
  open_issue_count: number
  created_at: string
}

export type Area = {
  id: number
  project: number
  project_key: string
  name: string
  description: string
}

export type Label = {
  id: number
  project: number
  project_key: string
  name: string
  color: string
}

export type Milestone = {
  id: number
  project: number
  project_key: string
  name: string
  description: string
  due_on: string | null
  closed: boolean
  open_issue_count: number
  created_at: string
}

export type IssueTemplate = {
  id: number
  project: number
  project_key: string
  name: string
  title: string
  body: string
  severity: Severity
  created_at: string
}

export type IssueLinkKind = 'blocks' | 'relates'

export type IssueLink = {
  id: number
  source: number
  target: number
  kind: IssueLinkKind
  source_key: string
  target_key: string
  source_title: string
  target_title: string
  created_at: string
}

export type IssueLabel = {
  id: number
  name: string
  color: string
}

export type Issue = {
  id: number
  number: number
  title: string
  body: string
  status: Status
  severity: Severity
  project: number
  project_name: string
  project_key: string
  milestone: number | null
  milestone_name: string | null
  area: number | null
  area_name: string | null
  labels: IssueLabel[]
  reporter_name: string
  comment_count: number
  created_at: string
  updated_at: string
}

export type IssueWrite = {
  title?: string
  body?: string
  status?: Status
  severity?: Severity
  project?: number
  milestone?: number | null
  area?: number | null
  label_ids?: number[]
}

export type Comment = {
  id: number
  issue: number
  body: string
  author: number
  author_name: string
  created_at: string
}

export type ActivityItem = {
  id: number
  kind: string
  detail: string
  created_at: string
  actor_name: string
  issue: number
  issue_title: string
  issue_number: number
  project_key: string
}

export type StatusCounts = {
  open: number
  in_progress: number
  resolved: number
  closed: number
  total: number
}

export type DashboardData = {
  counts: StatusCounts
  by_severity: { severity: Severity; label: string; count: number }[]
  recent_issues: Issue[]
  recent_activity: ActivityItem[]
}

export type SavedFilter = {
  id: number
  name: string
  search: string
  status: string
  severity: string
  project: number | null
  milestone: number | null
  label: number | null
  area: number | null
  created_at: string
}

export type IssueFilters = {
  search?: string
  status?: string
  severity?: string
  project?: string
  milestone?: string
  label?: string
  area?: string
}
