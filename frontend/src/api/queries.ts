import { api } from './client'
import type {
  ActivityItem,
  AuthResponse,
  Comment,
  DashboardData,
  Issue,
  IssueFilters,
  IssueLink,
  IssueLinkKind,
  IssueTemplate,
  IssueWrite,
  Area,
  Label,
  Milestone,
  Page,
  Project,
  SavedFilter,
  Status,
  TitleMatch,
} from './types'

function cleanParams(params?: Record<string, string | number | undefined>): Record<string, string | number> {
  const query: Record<string, string | number> = {}
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query[key] = value
  })
  return query
}

async function fetchList<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T[]> {
  const { data } = await api.get<Page<T>>(path, { params: cleanParams(params) })
  return data.results
}

export async function registerOwner(payload: { username: string; email: string; password: string }): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/register/', payload)
  return data
}

export async function login(payload: { username: string; password: string }): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/token/', payload)
  return data
}

export async function fetchProjects(): Promise<Project[]> {
  return fetchList<Project>('/projects/')
}

export async function fetchProject(id: number): Promise<Project> {
  const { data } = await api.get<Project>(`/projects/${id}/`)
  return data
}

export async function createProject(payload: { name: string; key?: string; description?: string }): Promise<Project> {
  const { data } = await api.post<Project>('/projects/', payload)
  return data
}

export async function fetchAreas(project?: string): Promise<Area[]> {
  return fetchList<Area>('/areas/', { project })
}

export async function createArea(payload: { project: number; name: string; description?: string }): Promise<Area> {
  const { data } = await api.post<Area>('/areas/', payload)
  return data
}

export async function fetchLabels(project?: string): Promise<Label[]> {
  return fetchList<Label>('/labels/', { project })
}

export async function createLabel(payload: { project: number; name: string; color: string }): Promise<Label> {
  const { data } = await api.post<Label>('/labels/', payload)
  return data
}

export async function fetchMilestones(project?: string): Promise<Milestone[]> {
  return fetchList<Milestone>('/milestones/', { project })
}

export async function createMilestone(payload: {
  project: number
  name: string
  description?: string
  due_on?: string | null
}): Promise<Milestone> {
  const { data } = await api.post<Milestone>('/milestones/', payload)
  return data
}

export async function updateMilestone(id: number, payload: { closed: boolean }): Promise<Milestone> {
  const { data } = await api.patch<Milestone>(`/milestones/${id}/`, payload)
  return data
}

export async function fetchIssues(filters: IssueFilters): Promise<Page<Issue>> {
  const { data } = await api.get<Page<Issue>>('/issues/', { params: cleanParams(filters) })
  return data
}

export async function fetchIssue(id: number): Promise<Issue> {
  const { data } = await api.get<Issue>(`/issues/${id}/`)
  return data
}

export async function checkIssueTitle(project: number, title: string): Promise<TitleMatch[]> {
  const { data } = await api.get<{ matches: TitleMatch[] }>('/issues/title-check/', {
    params: { project, title },
  })
  return data.matches
}

export async function createIssue(payload: IssueWrite): Promise<Issue> {
  const { data } = await api.post<Issue>('/issues/', payload)
  return data
}

export async function updateIssue(id: number, payload: IssueWrite): Promise<Issue> {
  const { data } = await api.patch<Issue>(`/issues/${id}/`, payload)
  return data
}

export async function deleteIssue(id: number): Promise<void> {
  await api.delete(`/issues/${id}/`)
}

export async function fetchIssueTemplates(project?: string): Promise<IssueTemplate[]> {
  return fetchList<IssueTemplate>('/issue-templates/', { project })
}

export async function createIssueTemplate(payload: {
  project: number
  name: string
  title: string
  body?: string
  severity: string
}): Promise<IssueTemplate> {
  const { data } = await api.post<IssueTemplate>('/issue-templates/', payload)
  return data
}

export async function deleteIssueTemplate(id: number): Promise<void> {
  await api.delete(`/issue-templates/${id}/`)
}

export async function fetchIssueLinks(issue: number): Promise<IssueLink[]> {
  return fetchList<IssueLink>('/issue-links/', { issue })
}

export async function createIssueLink(payload: { source: number; target: number; kind: IssueLinkKind }): Promise<IssueLink> {
  const { data } = await api.post<IssueLink>('/issue-links/', payload)
  return data
}

export async function deleteIssueLink(id: number): Promise<void> {
  await api.delete(`/issue-links/${id}/`)
}

export async function fetchComments(issue: number): Promise<Comment[]> {
  return fetchList<Comment>('/comments/', { issue })
}

export async function createComment(payload: { issue: number; body: string }): Promise<Comment> {
  const { data } = await api.post<Comment>('/comments/', payload)
  return data
}

export async function updateComment(id: number, body: string): Promise<Comment> {
  const { data } = await api.patch<Comment>(`/comments/${id}/`, { body })
  return data
}

export async function deleteComment(id: number): Promise<void> {
  await api.delete(`/comments/${id}/`)
}

export async function fetchActivity(issue: number): Promise<ActivityItem[]> {
  return fetchList<ActivityItem>('/activity/', { issue })
}

export async function fetchSavedFilters(): Promise<SavedFilter[]> {
  return fetchList<SavedFilter>('/saved-filters/')
}

export async function createSavedFilter(payload: {
  name: string
  search?: string
  status?: string
  severity?: string
  project?: number | null
  area?: number | null
}): Promise<SavedFilter> {
  const { data } = await api.post<SavedFilter>('/saved-filters/', payload)
  return data
}

export async function deleteSavedFilter(id: number): Promise<void> {
  await api.delete(`/saved-filters/${id}/`)
}

export async function bulkUpdateStatus(ids: number[], status: Status): Promise<{ updated: number[]; status: string }> {
  const { data } = await api.post<{ updated: number[]; status: string }>('/issues/bulk-status/', { ids, status })
  return data
}

export async function exportIssues(filters: IssueFilters): Promise<Blob> {
  const { data } = await api.get<Blob>('/issues/export/', {
    params: cleanParams(filters),
    responseType: 'blob',
  })
  return data
}

export async function fetchDashboard(): Promise<DashboardData> {
  const { data } = await api.get<DashboardData>('/dashboard/')
  return data
}
