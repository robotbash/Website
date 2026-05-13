'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

const REQUIREMENTS = 'At least 10 characters, one letter, and one number.'

export function SetupForm() {
  const router = useRouter()
  const params = useSearchParams()
  const isFirst = params.get('first') === '1'

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (password !== confirm) {
      toast.error('Passwords do not match')
      return
    }
    if (password.length < 10 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      toast.error(REQUIREMENTS)
      return
    }

    setLoading(true)

    const res = await fetch('/api/auth/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    const data = await res.json()

    if (!res.ok) {
      toast.error(data.error ?? 'Something went wrong')
      setLoading(false)
      return
    }

    toast.success('Password set. Welcome!')
    router.push('/')
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">
          {isFirst ? 'Welcome! Set your password' : 'Set a new password'}
        </CardTitle>
        <CardDescription>
          {isFirst
            ? 'Your account is ready. Create a password to get started.'
            : REQUIREMENTS}
        </CardDescription>
        {isFirst && (
          <p className="text-xs text-muted-foreground mt-1">{REQUIREMENTS}</p>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPw ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
                onClick={() => setShowPw((v) => !v)}
                tabIndex={-1}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input
              id="confirm"
              type={showPw ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Set password and sign in
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
