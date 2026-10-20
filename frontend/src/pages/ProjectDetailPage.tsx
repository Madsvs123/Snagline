import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Tags } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useParams } from 'react-router-dom'
import { z } from 'zod'

import { errorMessage } from '../api/client'
import { createLabel, fetchLabels, fetchProject } from '../api/queries'
import { Field } from '../components/Field'
import { PageHeader } from '../components/PageHeader'
import { QueryNotice } from '../components/QueryNotice'

const schema = z.object({
  name: z.string().trim().min(2, 'Use at least 2 characters').max(40),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Choose a color'),
})

type LabelValues = z.infer<typeof schema>

export function ProjectDetailPage() {
  const params = useParams()
  const id = Number(params.projectId)
  const validId = Number.isInteger(id) && id > 0
  const queryClient = useQueryClient()
  const [formError, setFormError] = useState<string | null>(null)
  const project = useQuery({
    queryKey: ['project', id],
    queryFn: () => fetchProject(id),
    enabled: validId,
  })
  const labels = useQuery({
    queryKey: ['labels', String(id)],
    queryFn: () => fetchLabels(String(id)),
    enabled: validId,
  })
  const form = useForm<LabelValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', color: '#2a6f97' },
  })
  const mutation = useMutation({
    mutationFn: (values: LabelValues) => createLabel({ project: id, name: values.name, color: values.color }),
    onSuccess: async () => {
      form.reset({ name: '', color: '#2a6f97' })
      setFormError(null)
      await queryClient.invalidateQueries({ queryKey: ['labels'] })
    },
    onError: (error) => setFormError(errorMessage(error)),
  })

  if (!validId) return <p className="error">That project address is not valid.</p>
  if (!project.data) return <QueryNotice isLoading={project.isLoading} error={project.error} />

  return (
    <>
      <PageHeader
        title={project.data.name}
        lede={project.data.description || 'No description yet.'}
        action={
          <Link to={`/issues?project=${project.data.id}`} className="button button-primary">
            View issues
          </Link>
        }
      />
      <p className="mono key-line">{project.data.key}</p>
      <section className="card stack">
        <h2>
          <Tags size={18} aria-hidden="true" /> Labels
        </h2>
        <div className="chip-row">
          {(labels.data ?? []).map((label) => (
            <span key={label.id} className="chip" style={{ color: label.color, borderColor: label.color }}>
              {label.name}
            </span>
          ))}
        </div>
        <form
          className="form-grid"
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
          noValidate
        >
          {formError ? <p className="banner wide" role="alert">{formError}</p> : null}
          <Field label="New label" error={form.formState.errors.name?.message}>
            <input placeholder="regression" {...form.register('name')} />
          </Field>
          <Field label="Color" error={form.formState.errors.color?.message}>
            <input type="color" {...form.register('color')} />
          </Field>
          <div className="wide">
            <button className="button button-ghost" type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Adding…' : 'Add label'}
            </button>
          </div>
        </form>
      </section>
    </>
  )
}
