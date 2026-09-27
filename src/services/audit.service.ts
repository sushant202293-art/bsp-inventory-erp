import { supabase } from '@/lib/supabase';
import type { AuditLog } from '@/types/database.types';

async function getCompanyId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single();
  if (error || !profile?.company_id) throw new Error('User profile not found');
  return profile.company_id;
}

async function getCurrentUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

export interface AuditLogFilters {
  module?: string;
  action?: string;
  record_id?: string;
  user_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface AuditLogListResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export async function logAction(
  action: string,
  module: string,
  recordId: string | null,
  oldValue: Record<string, unknown> | null,
  newValue: Record<string, unknown> | null
): Promise<void> {
  try {
    const companyId = await getCompanyId();
    const userId = await getCurrentUserId();

    const ipAddress =
      typeof window !== 'undefined' ? window.location.hostname || null : null;

    const { error } = await supabase
      .from('audit_logs')
      .insert({
        company_id: companyId,
        user_id: userId,
        action,
        module,
        record_id: recordId,
        old_value: oldValue,
        new_value: newValue,
        ip_address: ipAddress,
      });

    if (error) throw error;
  } catch (error) {
    console.error('Failed to log audit action:', error);
  }
}

export async function getAuditLogs(
  filters: AuditLogFilters = {},
  page: number = 1,
  perPage: number = 50
): Promise<AuditLogListResponse> {
  try {
    const companyId = await getCompanyId();
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = supabase
      .from('audit_logs')
      .select(`
        *,
        user:profiles(full_name, email)
      `, { count: 'exact' })
      .eq('company_id', companyId);

    if (filters.module) {
      query = query.eq('module', filters.module);
    }
    if (filters.action) {
      query = query.eq('action', filters.action);
    }
    if (filters.record_id) {
      query = query.eq('record_id', filters.record_id);
    }
    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id);
    }
    if (filters.date_from) {
      query = query.gte('created_at', filters.date_from);
    }
    if (filters.date_to) {
      const endDate = new Date(filters.date_to);
      endDate.setHours(23, 59, 59, 999);
      query = query.lte('created_at', endDate.toISOString());
    }
    if (filters.search) {
      query = query.or(`action.ilike.%${filters.search}%,module.ilike.%${filters.search}%`);
    }

    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;

    return {
      logs: (data || []) as AuditLog[],
      total: count || 0,
      page,
      per_page: perPage,
      total_pages: Math.ceil((count || 0) / perPage),
    };
  } catch (error) {
    throw new Error(`Failed to fetch audit logs: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getAuditLogsByRecord(
  module: string,
  recordId: string
): Promise<AuditLog[]> {
  try {
    const companyId = await getCompanyId();

    const { data, error } = await supabase
      .from('audit_logs')
      .select(`
        *,
        user:profiles(full_name, email)
      `)
      .eq('company_id', companyId)
      .eq('module', module)
      .eq('record_id', recordId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as AuditLog[];
  } catch (error) {
    throw new Error(`Failed to fetch audit logs for record: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getRecentChanges(limit: number = 20): Promise<AuditLog[]> {
  try {
    const companyId = await getCompanyId();

    const { data, error } = await supabase
      .from('audit_logs')
      .select(`
        *,
        user:profiles(full_name, email)
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as AuditLog[];
  } catch (error) {
    throw new Error(`Failed to fetch recent changes: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
