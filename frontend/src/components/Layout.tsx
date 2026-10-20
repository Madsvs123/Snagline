import clsx from 'clsx'
import { Bug, Flag, FolderKanban, LayoutDashboard, LogOut } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'

import { useAuth } from '../store/auth'

const LINKS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/issues', label: 'Issues', icon: Bug, end: false },
  { to: '/projects', label: 'Projects', icon: FolderKanban, end: false },
  { to: '/milestones', label: 'Milestones', icon: Flag, end: false },
]

export function Layout() {
  const username = useAuth((state) => state.username)
  const clear = useAuth((state) => state.clear)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  function logout() {
    clear()
    queryClient.clear()
    navigate('/login')
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <NavLink to="/" className="wordmark">
          Snag<span>line</span>
        </NavLink>
        <nav>
          {LINKS.map((link) => {
            const Icon = link.icon
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => clsx('nav-link', isActive && 'active')}
              >
                <Icon size={18} aria-hidden="true" />
                {link.label}
              </NavLink>
            )
          })}
        </nav>
        <div className="sidebar-foot">
          <div>
            <strong>{username}</strong>
            <span>Owner</span>
          </div>
          <button type="button" className="button" onClick={logout}>
            <LogOut size={16} aria-hidden="true" />
            Log out
          </button>
        </div>
      </aside>
      <div className="workspace">
        <Outlet />
      </div>
    </div>
  )
}
