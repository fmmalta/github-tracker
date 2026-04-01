'use client'
import { useForm } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { setAccessToken } from '@/lib/auth'

interface SignupForm {
  email: string
  password: string
  confirmPassword: string
}

const MAX_ATTEMPTS = 5
const WINDOW_MS = 60 * 60 * 1000

export default function SignupPage() {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<SignupForm>()
  const [apiError, setApiError] = useState<string | null>(null)
  const router = useRouter()
  const attemptsRef = useRef<number[]>([])

  const checkClientRateLimit = useCallback((): boolean => {
    const now = Date.now()
    attemptsRef.current = attemptsRef.current.filter(t => now - t < WINDOW_MS)
    if (attemptsRef.current.length >= MAX_ATTEMPTS) {
      setApiError('Too many attempts. Please wait before trying again.')
      return false
    }
    attemptsRef.current.push(now)
    return true
  }, [])

  const onSubmit = async (data: SignupForm) => {
    setApiError(null)
    if (!checkClientRateLimit()) return

    try {
      const res = await fetch('/api/v1/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: data.email, password: data.password }),
      })
      if (!res.ok) {
        const err = await res.json()
        setApiError(err.message || 'Signup failed')
        return
      }
      const { accessToken } = await res.json()
      setAccessToken(accessToken)
      document.cookie = 'auth_present=true; path=/; max-age=2592000'
      router.push('/')
    } catch {
      setApiError('Network error. Please try again.')
    }
  }

  const password = watch('password')

  return (
    <Card className="w-full min-w-[380px] max-w-[440px] border-border bg-card">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-xl font-bold text-foreground tracking-tight">
          GitHub Analytics
        </CardTitle>
        <CardDescription className="text-muted-foreground text-sm">
          Create your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        {apiError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{apiError}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm text-foreground">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              autoComplete="email"
              aria-invalid={!!errors.email}
              {...register('email', { required: 'Email required' })}
            />
            {errors.email && (
              <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm text-foreground">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              aria-invalid={!!errors.password}
              {...register('password', {
                required: 'Password required',
                minLength: { value: 8, message: 'Min 8 characters' },
                maxLength: { value: 128, message: 'Max 128 characters' },
              })}
            />
            {errors.password && (
              <p className="text-xs text-destructive mt-1">{errors.password.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-sm text-foreground">
              Confirm password
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              aria-invalid={!!errors.confirmPassword}
              {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: value => value === password || 'Passwords do not match',
              })}
            />
            {errors.confirmPassword && (
              <p className="text-xs text-destructive mt-1">{errors.confirmPassword.message}</p>
            )}
          </div>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2"
          >
            {isSubmitting ? 'Creating account...' : 'Create account'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
