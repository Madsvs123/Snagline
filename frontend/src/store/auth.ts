import { create } from 'zustand'

type Session = {
  access: string
  refresh: string
  username: string
}

type AuthState = Session & {
  setSession: (access: string, refresh: string, username: string) => void
  clear: () => void
}

const STORAGE_KEY = 'snagline-auth'

function loadSession(): Session {
  const empty = { access: '', refresh: '', username: '' }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return empty
    const parsed = JSON.parse(raw) as Partial<Session>
    if (!parsed.access || !parsed.refresh || !parsed.username) return empty
    return { access: parsed.access, refresh: parsed.refresh, username: parsed.username }
  } catch {
    return empty
  }
}

const initial = loadSession()

export const useAuth = create<AuthState>((set) => ({
  access: initial.access,
  refresh: initial.refresh,
  username: initial.username,
  setSession: (access, refresh, username) => {
    const session = { access, refresh, username }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    set(session)
  },
  clear: () => {
    localStorage.removeItem(STORAGE_KEY)
    set({ access: '', refresh: '', username: '' })
  },
}))
