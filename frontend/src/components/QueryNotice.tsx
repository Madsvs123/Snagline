import { errorMessage } from '../api/client'

export function QueryNotice({ isLoading, error }: { isLoading: boolean; error: unknown }) {
  if (isLoading) return <p className="muted">Loading…</p>
  if (error) return <p className="error" role="alert">{errorMessage(error)}</p>
  return null
}
