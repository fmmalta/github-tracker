'use client'
import { useForm } from 'react-hook-form'
import { Box, Card, CardContent, TextField, Button, Typography, Alert } from '@mui/material'
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
      router.push('/dashboard')
    } catch {
      setApiError('Network error. Please try again.')
    }
  }

  return (
    <Card sx={{ minWidth: 380, maxWidth: 440 }}>
      <CardContent sx={{ p: 4 }}>
        <Typography variant="h5" fontWeight="bold" mb={3}>
          GitHub Analytics Platform
        </Typography>
        {apiError && <Alert severity="error" sx={{ mb: 2 }}>{apiError}</Alert>}
        <Box component="form" onSubmit={handleSubmit(onSubmit)} display="flex" flexDirection="column" gap={2}>
          <TextField label="Email" type="email" {...register('email', { required: 'Email required' })} error={!!errors.email} helperText={errors.email?.message} />
          <TextField label="Password" type="password" {...register('password', { required: 'Password required', minLength: { value: 8, message: 'Min 8 characters' } })} error={!!errors.password} helperText={errors.password?.message} />
          <Button type="submit" variant="contained" size="large" disabled={isSubmitting} sx={{ mt: 1 }}>
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  )
}
