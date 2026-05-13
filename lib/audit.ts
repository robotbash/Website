import { createClient } from '@supabase/supabase-js'

// Use the service role key so audit log writes bypass RLS
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export type AuditAction =
  | 'clock_in'
  | 'clock_out'
  | 'break_start'
  | 'break_end'
  | 'punch_undo'
  | 'correction_submitted'
  | 'correction_approved'
  | 'correction_denied'
  | 'pto_requested'
  | 'pto_adjusted'
  | 'pto_deleted'
  | 'sick_day_logged'
  | 'sick_day_deleted'
  | 'user_created'
  | 'user_updated'
  | 'user_deactivated'
  | 'user_reactivated'
  | 'role_changed'
  | 'password_reset_sent'
  | 'force_logout'
  | 'announcement_created'
  | 'announcement_deleted'
  | 'holiday_created'
  | 'holiday_deleted'
  | 'settings_updated'
  | 'pto_balance_adjusted'
  | 'invite_sent'

interface AuditParams {
  userId: string | null
  action: AuditAction
  targetUserId?: string | null
  targetRecordId?: string | null
  tableName?: string | null
  oldValue?: Record<string, unknown> | null
  newValue?: Record<string, unknown> | null
  ipAddress?: string | null
  userAgent?: string | null
}

export async function logAudit(params: AuditParams): Promise<void> {
  try {
    const supabase = getAdminClient()
    await supabase.from('audit_log').insert({
      user_id: params.userId,
      action: params.action,
      target_user_id: params.targetUserId ?? null,
      target_record_id: params.targetRecordId ?? null,
      table_name: params.tableName ?? null,
      old_value: params.oldValue ?? null,
      new_value: params.newValue ?? null,
      ip_address: params.ipAddress ?? null,
      user_agent: params.userAgent ?? null,
    })
  } catch (err) {
    // Audit failures must not break the main operation — log to console
    console.error('[audit] Failed to write audit log:', err)
  }
}
