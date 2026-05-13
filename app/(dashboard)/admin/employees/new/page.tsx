import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CreateEmployeeForm } from '@/components/admin/create-employee-form'

export const metadata: Metadata = { title: 'Add Employee' }

export default async function NewEmployeePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: adminRow } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (adminRow?.role !== 'admin') redirect('/')

  return (
    <div className="container max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Add Employee</h1>
      <CreateEmployeeForm />
    </div>
  )
}
