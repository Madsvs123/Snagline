import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Boxes, Tags } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useParams } from 'react-router-dom'
import { z } from 'zod'

import { errorMessage } from '../api/client'
import { createArea, createLabel, fetchAreas, fetchLabels, fetchProject } from '../api/queries'
import { Field } from '../components/Field'
import { PageHeader } from '../components/PageHeader'
import { QueryNotice } from '../components/QueryNotice'

const schema = z.object({
  name: z.string().trim().min(2, 'Use at least 2 characters').max(40),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Choose a color'),
})

const areaSchema = z.object({
  name: z.string().trim().min(2, 'Use at least 2 characters').max(80),
  description: z.string().max(2000),
})

type LabelValues = z.infer<typeof schema>
type AreaValues = z.infer<typeof areaSchema>

export function ProjectDetailPage() {
  const params = useParams()
  const id = Number(params.projectId)
  const validId = Number.isInteger(id) && id > 0
  const queryClient = useQueryClient()
  const [formError, setFormError] = useState<string | null>(null)
  const [areaError, setAreaError] = useState<string | null>(null)
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
  const areas = useQuery({
    queryKey: ['areas', String(id)],
    queryFn: () => fetchAreas(String(id)),
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
  const areaForm = useForm<AreaValues>({
    resolver: zodResolver(areaSchema),
    defaultValues: { name: '', description: '' },
  })
  const areaMutation = useMutation({
    mutationFn: (values: AreaValues) => createArea({ project: id, name: values.name, description: values.description }),
    onSuccess: async () => {
      areaForm.reset({ name: '', description: '' })
      setAreaError(null)
      await queryClient.invalidateQueries({ queryKey: ['areas'] })
    },
    onError: (error) => setAreaError(errorMessage(error)),
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
          <Boxes size={18} aria-hidden="true" /> Areas
        </h2>
        <p className="muted">Name the parts of this project, such as the editor or the API.</p>
        {(areas.data ?? []).length === 0 ? <p className="muted">No areas yet.</p> : null}
        <ul className="comment-list">
          {(areas.data ?? []).map((item) => (
            <li key={item.id}>
              <strong>{item.name}</strong>
              {item.description ? <span className="muted">{item.description}</span> : null}
            </li>
          ))}
        </ul>
        <form
          className="form-grid"
          onSubmit={areaForm.handleSubmit((values) => areaMutation.mutate(values))}
          noValidate
        >
          {areaError ? <p className="banner wide" role="alert">{areaError}</p> : null}
          <Field label="New area" error={areaForm.formState.errors.name?.message}>
            <input placeholder="Editor" {...areaForm.register('name')} />
          </Field>
          <Field label="Description" error={areaForm.formState.errors.description?.message}>
            <input placeholder="Draft persistence" {...areaForm.register('description')} />
          </Field>
          <div className="wide">
            <button className="button button-ghost" type="submit" disabled={areaMutation.isPending}>
              {areaMutation.isPending ? 'Adding…' : 'Add area'}
            </button>
          </div>
        </form>
      </section>
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
