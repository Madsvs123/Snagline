import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

import { useAuth } from '../store/auth'

export const apiBaseURL = import.meta.env.VITE_API_URL || '/api'

export const api = axios.create({
  baseURL: apiBaseURL,
  headers: { 'Content-Type': 'application/json' },
})

const refreshClient = axios.create({
  baseURL: apiBaseURL,
  headers: { 'Content-Type': 'application/json' },
})

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean }

api.interceptors.request.use((config) => {
  const url = config.url ?? ''
  if (url.includes('/auth/register/') || url.includes('/auth/token/')) {
    return config
  }
  const access = useAuth.getState().access
  if (access) {
    config.headers.Authorization = `Bearer ${access}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined
    if (!original || error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }
    const url = original.url ?? ''
    if (url.includes('/auth/')) {
      return Promise.reject(error)
    }
    original._retry = true
    const refresh = useAuth.getState().refresh
    if (!refresh) {
      useAuth.getState().clear()
      return Promise.reject(error)
    }
    try {
      const { data } = await refreshClient.post<{ access: string }>('/auth/token/refresh/', { refresh })
      const username = useAuth.getState().username ?? ''
      useAuth.getState().setSession(data.access, refresh, username)
      original.headers.Authorization = `Bearer ${data.access}`
      return api(original)
    } catch (refreshError) {
      useAuth.getState().clear()
      return Promise.reject(refreshError)
    }
  },
)

export function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data
    if (typeof data === 'string' && data.trim()) return data
    if (data && typeof data === 'object') {
      const record = data as Record<string, unknown>
      if (typeof record.detail === 'string') return record.detail
      const parts = Object.entries(record).map(([key, value]) => {
        const text = Array.isArray(value) ? value.map(String).join(' ') : String(value)
        return `${key}: ${text}`
      })
      if (parts.length) return parts.join(' ')
    }
    if (error.response?.status === 401) return 'Sign in again to continue.'
  }
  return 'Something went wrong. Try again.'
}
