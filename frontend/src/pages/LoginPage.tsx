import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { errorMessage } from '../api/client'
import { login } from '../api/queries'
import { AuthLayout } from '../components/AuthLayout'
import { Field } from '../components/Field'
import { useAuth } from '../store/auth'

const schema = z.object({
  username: z.string().trim().min(1, 'Enter your username'),
  password: z.string().min(1, 'Enter your password'),
})

type LoginValues = z.infer<typeof schema>

export function LoginPage() {
  const access = useAuth((state) => state.access)
  const setSession = useAuth((state) => state.setSession)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: '', password: '' },
  })
  const mutation = useMutation({ mutationFn: login })

  if (access) return <Navigate to="/" replace />

  return (
    <AuthLayout
      title="Sign in"
      lede="Open the owner workspace for your projects."
      footer={
        <>
          New here? <Link to="/register">Create the owner account</Link>
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
        <Field label="Password" error={form.formState.errors.password?.message}>
          <input type="password" autoComplete="current-password" {...form.register('password')} />
        </Field>
        <button className="button button-primary" type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthLayout>
  )
}
