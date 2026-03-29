'use client'
import { useForm } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface LoginForm { email: string; password: string }

export default function LoginPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>()
  const [apiError, setApiError] = useState<string | null>(null)
  const router = useRouter()

  const onSubmit = async (data: LoginForm) => {
    setApiError(null)
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        setApiError(err.message || 'Login failed')
        return
      }
      const { accessToken, refreshToken } = await res.json()
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)
      document.cookie = 'auth_present=true; path=/; max-age=2592000'
      router.push('/')
    } catch {
      setApiError('Network error. Please try again.')
    }
  }

  return (
    <div className="w-full max-w-sm border border-border rounded-lg bg-card p-8">
      <h1 className="text-lg font-bold text-foreground mb-6">GitHub Analytics Platform</h1>
      {apiError && (
        <div className="border-l-2 border-red-500 bg-red-500/10 text-red-400 p-3 rounded mb-4 text-sm">
          {apiError}
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Email</label>
          <input
            type="email"
            className="w-full text-sm bg-background border border-border rounded px-3 py-2 text-foreground focus:outline-none focus:border-primary"
            {...register('email', { required: 'Email required' })}
          />
          {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Password</label>
          <input
            type="password"
            className="w-full text-sm bg-background border border-border rounded px-3 py-2 text-foreground focus:outline-none focus:border-primary"
            {...register('password', { required: 'Password required', minLength: { value: 8, message: 'Min 8 characters' } })}
          />
          {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-1 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded px-4 py-2.5 disabled:opacity-50 transition-colors"
        >
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
