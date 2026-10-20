import { api } from './client'
import type {
  ActivityItem,
  AuthResponse,
  Comment,
  DashboardData,
  Issue,
  IssueFilters,
  IssueWrite,
  Label,
  Milestone,
  Page,
  Project,
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

export async function fetchComments(issue: number): Promise<Comment[]> {
  return fetchList<Comment>('/comments/', { issue })
}

export async function createComment(payload: { issue: number; body: string }): Promise<Comment> {
  const { data } = await api.post<Comment>('/comments/', payload)
  return data
}

export async function deleteComment(id: number): Promise<void> {
  await api.delete(`/comments/${id}/`)
}

export async function fetchActivity(issue: number): Promise<ActivityItem[]> {
  return fetchList<ActivityItem>('/activity/', { issue })
}

export async function fetchDashboard(): Promise<DashboardData> {
  const { data } = await api.get<DashboardData>('/dashboard/')
  return data
}
