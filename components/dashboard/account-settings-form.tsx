'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'

const REQUIREMENTS = 'At least 10 characters, one letter, and one number.'

interface AccountSettingsFormProps {
  fullName: string
  email: string
}

export function AccountSettingsForm({ fullName, email }: AccountSettingsFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPw) { toast.error('Passwords do not match'); return }
    if (newPassword.length < 10 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      toast.error(REQUIREMENTS); return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) { toast.error(error.message); setLoading(false); return }

    toast.success('Password updated')
    setNewPassword('')
    setConfirmPw('')
    setLoading(false)
  }

  async function handleSignOutEverywhere() {
    await fetch('/api/auth/sign-out-everywhere', { method: 'POST' })
    toast.success('Signed out of all devices')
    router.push('/login')
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Name</Label>
            <p className="font-medium">{fullName}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Email</Label>
            <p className="font-medium">{email}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Contact your admin to update your name or email.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newpw">New password</Label>
              <p className="text-xs text-muted-foreground">{REQUIREMENTS}</p>
              <div className="relative">
                <Input
                  id="newpw"
                  type={showPw ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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
              <Label htmlFor="confirmpw">Confirm password</Label>
              <Input
                id="confirmpw"
                type={showPw ? 'text' : 'password'}
                required
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Update password
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            This signs you out of all browsers and devices immediately.
          </p>
          <Button variant="outline" onClick={handleSignOutEverywhere}>
            Sign out everywhere
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
