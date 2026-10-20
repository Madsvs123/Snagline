import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { errorMessage } from '../api/client'
import { registerOwner } from '../api/queries'
import { AuthLayout } from '../components/AuthLayout'
import { Field } from '../components/Field'
import { useAuth } from '../store/auth'

const schema = z.object({
  username: z.string().trim().min(3, 'Use at least 3 characters').max(150),
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(8, 'Use at least 8 characters'),
})

type RegisterValues = z.infer<typeof schema>

export function RegisterPage() {
  const access = useAuth((state) => state.access)
  const setSession = useAuth((state) => state.setSession)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<RegisterValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: '', email: '', password: '' },
  })
  const mutation = useMutation({ mutationFn: registerOwner })

  if (access) return <Navigate to="/" replace />

  return (
    <AuthLayout
      title="Create the owner account"
      lede="Registration also creates your Inbox project."
      footer={
        <>
          Already registered? <Link to="/login">Sign in</Link>
        </>
      }
    >
      <form
        className="stack"
        onSubmit={form.handleSubmit((values) => {
          setFormError(null)
          mutation.mutate(values, {
            onSuccess: (data) => {
              setSession(data.access, data.refresh, data.username)
              queryClient.clear()
              navigate('/')
            },
            onError: (error) => setFormError(errorMessage(error)),
          })
        })}
        noValidate
      >
        {formError ? <p className="banner" role="alert">{formError}</p> : null}
        <Field label="Username" error={form.formState.errors.username?.message}>
          <input autoComplete="username" {...form.register('username')} />
        </Field>
        <Field label="Email" error={form.formState.errors.email?.message}>
          <input type="email" autoComplete="email" {...form.register('email')} />
        </Field>
        <Field label="Password" error={form.formState.errors.password?.message}>
          <input type="password" autoComplete="new-password" {...form.register('password')} />
        </Field>
        <button className="button button-primary" type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthLayout>
  )
}
