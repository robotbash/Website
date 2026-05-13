import type { Metadata } from 'next'
import { SetupForm } from '@/components/auth/setup-form'

export const metadata: Metadata = { title: 'Set Up Your Account' }

export default function SetupPage() {
  return <SetupForm />
}
