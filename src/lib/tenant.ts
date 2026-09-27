import { supabase } from '@/lib/supabase';

let cachedCompanyId: string | null = null;
// The cache must be keyed by user: without it, signing out and signing in
// as a different user in the same tab served the previous tenant's id.
let cachedForUserId: string | null = null;

export function clearCompanyIdCache(): void {
  cachedCompanyId = null;
  cachedForUserId = null;
}

export async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Not authenticated');
  return data.user.id;
}

export async function getCompanyId(): Promise<string> {
  const userId = await getCurrentUserId();

  if (cachedCompanyId && cachedForUserId === userId) return cachedCompanyId;

  const { data, error } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw new Error('User profile not found');
  const companyId = (data as { company_id: string | null } | null)?.company_id;
  if (!companyId) throw new Error('No company is linked to this account');

  cachedCompanyId = companyId;
  cachedForUserId = userId;
  return companyId;
}

export interface CompanyIdentity {
  id: string;
  name: string;
  state: string;
  stateCode: string;
}

export async function getCompanyIdentity(): Promise<CompanyIdentity> {
  const companyId = await getCompanyId();
  const { data, error } = await supabase
    .from('companies')
    .select('id, name, state, state_code')
    .eq('id', companyId)
    .maybeSingle();

  if (error) throw new Error('Company not found');

  return {
    id: companyId,
    name: (data as { name?: string } | null)?.name ?? '',
    state: (data as { state?: string } | null)?.state ?? '',
    stateCode: (data as { state_code?: string } | null)?.state_code ?? '',
  };
}

export async function getDefaultWarehouseId(): Promise<string> {
  const companyId = await getCompanyId();

  // Prefer the explicit `is_default` flag; fall back to the oldest active
  // warehouse for companies whose rows predate migration 005.
  const { data, error } = await supabase
    .from('warehouses')
    .select('id, is_default')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error('Failed to resolve warehouse');
  const id = (data as { id?: string } | null)?.id;
  if (!id) throw new Error('No active warehouse found. Create one in Settings first.');
  return id;
}
