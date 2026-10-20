import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { errorMessage } from '../api/client'
import { createIssue, fetchLabels, fetchMilestones, fetchProjects } from '../api/queries'
import type { Status, Severity } from '../api/types'
import { Field } from '../components/Field'
import { PageHeader } from '../components/PageHeader'
import { SEVERITIES, STATUSES } from '../lib/constants'

const schema = z.object({
  title: z.string().trim().min(3, 'Use at least 3 characters').max(200),
  body: z.string().max(8000),
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  project: z.string().min(1, 'Choose a project'),
  milestone: z.string(),
  label_ids: z.array(z.string()).optional(),
})

type IssueFormValues = z.infer<typeof schema>

export function NewIssuePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [formError, setFormError] = useState<string | null>(null)
  const projects = useQuery({ queryKey: ['projects'], queryFn: fetchProjects })
  const labels = useQuery({ queryKey: ['labels'], queryFn: () => fetchLabels() })
  const milestones = useQuery({ queryKey: ['milestones'], queryFn: () => fetchMilestones() })
  const form = useForm<IssueFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      body: '',
      status: 'open',
      severity: 'medium',
      project: '',
      milestone: '',
      label_ids: [],
    },
  })
  const projectId = form.watch('project')
  const previousProject = useRef(projectId)

  useEffect(() => {
    if (!form.getValues('project') && projects.data?.[0]) {
      form.setValue('project', String(projects.data[0].id))
    }
  }, [projects.data, form])

  useEffect(() => {
    if (previousProject.current !== projectId) {
      form.setValue('label_ids', [])
      form.setValue('milestone', '')
      previousProject.current = projectId
    }
  }, [projectId, form])

  const mutation = useMutation({
    mutationFn: createIssue,
    onSuccess: async (issue) => {
      await queryClient.invalidateQueries({ queryKey: ['issues'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
      navigate(`/issues/${issue.id}`)
    },
    onError: (error) => setFormError(errorMessage(error)),
  })

  const projectLabels = (labels.data ?? []).filter((label) => String(label.project) === projectId)
  const projectMilestones = (milestones.data ?? []).filter(
    (milestone) => String(milestone.project) === projectId && !milestone.closed,
  )

  return (
    <>
      <PageHeader title="New issue" lede="Describe the defect or task, then file it on a project." />
      <form
        className="card stack"
        onSubmit={form.handleSubmit((values) => {
          setFormError(null)
          const selected = (values.label_ids ?? [])
            .map(Number)
            .filter((id) => projectLabels.some((label) => label.id === id))
          mutation.mutate({
            title: values.title,
            body: values.body,
            status: values.status as Status,
            severity: values.severity as Severity,
            project: Number(values.project),
            milestone: values.milestone ? Number(values.milestone) : null,
            label_ids: selected,
          })
        })}
        noValidate
      >
        {formError ? <p className="banner" role="alert">{formError}</p> : null}
        <Field label="Title" error={form.formState.errors.title?.message} className="wide">
          <input placeholder="Save button drops the draft" {...form.register('title')} />
        </Field>
        <Field label="Description" error={form.formState.errors.body?.message} className="wide">
          <textarea placeholder="What happened, and how to reproduce it." {...form.register('body')} />
        </Field>
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
        <Field label="Milestone" error={form.formState.errors.milestone?.message}>
          <select {...form.register('milestone')}>
            <option value="">No milestone</option>
            {projectMilestones.map((milestone) => (
              <option key={milestone.id} value={milestone.id}>
                {milestone.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status" error={form.formState.errors.status?.message}>
          <select {...form.register('status')}>
            {STATUSES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Severity" error={form.formState.errors.severity?.message}>
          <select {...form.register('severity')}>
            {SEVERITIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
        <fieldset className="wide label-set">
          <legend>Labels</legend>
          {projectLabels.length === 0 ? (
            <p className="muted">This project has no labels yet.</p>
          ) : (
            projectLabels.map((label) => (
              <label key={label.id} className="check">
                <input type="checkbox" value={label.id} {...form.register('label_ids')} />
                <span className="chip" style={{ color: label.color, borderColor: label.color }}>
                  {label.name}
                </span>
              </label>
            ))
          )}
        </fieldset>
        <div className="wide">
          <button className="button button-primary" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Filing…' : 'File issue'}
          </button>
        </div>
      </form>
    </>
  )
}
