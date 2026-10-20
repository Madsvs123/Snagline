import { Navigate, Route, Routes } from 'react-router-dom'

import { Layout } from './components/Layout'
import { RequireAuth } from './components/RequireAuth'
import { DashboardPage } from './pages/DashboardPage'
import { IssueDetailPage } from './pages/IssueDetailPage'
import { IssuesPage } from './pages/IssuesPage'
import { LoginPage } from './pages/LoginPage'
import { MilestonesPage } from './pages/MilestonesPage'
import { NewIssuePage } from './pages/NewIssuePage'
import { ProjectDetailPage } from './pages/ProjectDetailPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { RegisterPage } from './pages/RegisterPage'

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/issues" element={<IssuesPage />} />
          <Route path="/issues/new" element={<NewIssuePage />} />
          <Route path="/issues/:issueId" element={<IssueDetailPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
          <Route path="/milestones" element={<MilestonesPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
