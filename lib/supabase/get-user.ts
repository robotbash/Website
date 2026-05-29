import { cache } from 'react'
import { createClient } from './server'
import type { User } from './types'

export const getAuthUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})

export const getUserRow = cache(async (userId: string): Promise<User | null> => {
  const supabase = await createClient()
  const { data } = await supabase.from('users').select('*').eq('id', userId).single()
  return data as User | null
})
