import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { errorMessage } from '../api/client'
import { createMilestone, fetchMilestones, fetchProjects, updateMilestone } from '../api/queries'
import { Field } from '../components/Field'
import { PageHeader } from '../components/PageHeader'
import { QueryNotice } from '../components/QueryNotice'
import { shortDate } from '../lib/format'

const schema = z.object({
  project: z.string().min(1, 'Choose a project'),
  name: z.string().trim().min(2, 'Use at least 2 characters').max(120),
  description: z.string().max(4000),
  due_on: z.string(),
})

type MilestoneValues = z.infer<typeof schema>

export function MilestonesPage() {
  const queryClient = useQueryClient()
  const [formError, setFormError] = useState<string | null>(null)
  const projects = useQuery({ queryKey: ['projects'], queryFn: fetchProjects })
  const milestones = useQuery({ queryKey: ['milestones'], queryFn: () => fetchMilestones() })
  const form = useForm<MilestoneValues>({
    resolver: zodResolver(schema),
    defaultValues: { project: '', name: '', description: '', due_on: '' },
  })
  const mutation = useMutation({
    mutationFn: (values: MilestoneValues) =>
      createMilestone({
        project: Number(values.project),
        name: values.name,
        description: values.description,
        due_on: values.due_on || null,
      }),
    onSuccess: async () => {
      form.reset({ project: form.getValues('project'), name: '', description: '', due_on: '' })
      setFormError(null)
      await queryClient.invalidateQueries({ queryKey: ['milestones'] })
    },
    onError: (error) => setFormError(errorMessage(error)),
  })
  const toggle = useMutation({
    mutationFn: ({ id, closed }: { id: number; closed: boolean }) => updateMilestone(id, { closed }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['milestones'] })
    },
  })

  return (
    <>
      <PageHeader title="Milestones" lede="Group defects and tasks toward a release or a chunk of work." />
      {milestones.data ? (
        milestones.data.length === 0 ? (
          <p className="empty">No milestones yet.</p>
        ) : (
          <ul className="milestone-list">
            {milestones.data.map((milestone) => (
              <li key={milestone.id} className="card milestone">
                <div>
                  <span className="mono">{milestone.project_key}</span>
                  <strong>{milestone.name}</strong>
                  <p>{milestone.description || 'No description yet.'}</p>
                  <span className="muted">
                    {milestone.due_on ? `Due ${shortDate(milestone.due_on)}` : 'No due date'} · {milestone.open_issue_count} open
                    {milestone.closed ? ' · closed' : ''}
                  </span>
                  <div className="progress" role="meter" aria-valuenow={milestone.progress_percent} aria-valuemin={0} aria-valuemax={100} aria-label={`${milestone.name} progress`}>
                    <span style={{ width: `${milestone.progress_percent}%` }} />
                  </div>
                  <span className="muted">
                    {milestone.progress_percent}% complete · {milestone.done_issue_count} of {milestone.total_issue_count} resolved or closed
                  </span>
                </div>
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={() => toggle.mutate({ id: milestone.id, closed: !milestone.closed })}
                  disabled={toggle.isPending}
                >
                  {milestone.closed ? 'Reopen' : 'Close'}
                </button>
              </li>
            ))}
          </ul>
        )
      ) : (
        <QueryNotice isLoading={milestones.isLoading} error={milestones.error} />
      )}
      <form
        className="card stack"
        onSubmit={form.handleSubmit((values) => {
          setFormError(null)
          mutation.mutate(values)
        })}
        noValidate
      >
        <h2>New milestone</h2>
        {formError ? <p className="banner" role="alert">{formError}</p> : null}
        <div className="form-grid">
          <Field label="Project" error={form.formState.errors.project?.message}>
            <select {...form.register('project')}>
              <option value="">Choose a project</option>
              {(projects.data ?? []).map((project) => (
                <option key={project.id} value={project.id}>
                  {project.key} · {project.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Name" error={form.formState.errors.name?.message}>
            <input placeholder="Editor fixes" {...form.register('name')} />
          </Field>
          <Field label="Due date" error={form.formState.errors.due_on?.message}>
            <input type="date" {...form.register('due_on')} />
          </Field>
          <Field label="Description" error={form.formState.errors.description?.message} className="wide">
            <textarea {...form.register('description')} />
          </Field>
        </div>
        <button className="button button-primary" type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Creating…' : 'Create milestone'}
        </button>
      </form>
    </>
  )
}
