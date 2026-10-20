import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'

import { errorMessage } from '../api/client'
import { createProject, fetchProjects } from '../api/queries'
import { PageHeader } from '../components/PageHeader'
import { QueryNotice } from '../components/QueryNotice'
import { Field } from '../components/Field'
import { timeAgo } from '../lib/format'

const schema = z.object({
  name: z.string().trim().min(2, 'Use at least 2 characters').max(120),
  key: z.string().trim().max(12),
  description: z.string().max(4000),
})

type ProjectValues = z.infer<typeof schema>

export function ProjectsPage() {
  const queryClient = useQueryClient()
  const [formError, setFormError] = useState<string | null>(null)
  const projects = useQuery({ queryKey: ['projects'], queryFn: fetchProjects })
  const form = useForm<ProjectValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', key: '', description: '' },
  })
  const mutation = useMutation({
    mutationFn: createProject,
    onSuccess: async () => {
      form.reset()
      setFormError(null)
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
    onError: (error) => setFormError(errorMessage(error)),
  })

  return (
    <>
      <PageHeader title="Projects" lede="Each project keeps its own issues, labels, and milestones." />
      {projects.data ? (
        <ul className="project-list">
          {projects.data.map((project) => (
            <li key={project.id}>
              <Link to={`/projects/${project.id}`} className="card project-card">
                <span className="mono">{project.key}</span>
                <strong>{project.name}</strong>
                <p>{project.description || 'No description yet.'}</p>
                <span className="muted">
                  {project.open_issue_count} open · created {timeAgo(project.created_at)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <QueryNotice isLoading={projects.isLoading} error={projects.error} />
      )}
      <form
        className="card stack"
        onSubmit={form.handleSubmit((values) => {
          setFormError(null)
          mutation.mutate({
            name: values.name,
            key: values.key || undefined,
            description: values.description,
          })
        })}
        noValidate
      >
        <h2>New project</h2>
        {formError ? <p className="banner" role="alert">{formError}</p> : null}
        <div className="form-grid">
          <Field label="Name" error={form.formState.errors.name?.message}>
            <input placeholder="Editor" {...form.register('name')} />
          </Field>
          <Field label="Key" error={form.formState.errors.key?.message}>
            <input placeholder="EDIT" {...form.register('key')} />
          </Field>
          <Field label="Description" error={form.formState.errors.description?.message} className="wide">
            <textarea {...form.register('description')} />
          </Field>
        </div>
        <button className="button button-primary" type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Creating…' : 'Create project'}
        </button>
      </form>
    </>
  )
}
