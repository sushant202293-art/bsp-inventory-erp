import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Company } from '@/types/database.types';

export type { Company };

export interface BankAccount {
  bank_name: string;
  account_name: string;
  account_number: string;
  ifsc: string;
  branch: string;
  upi: string;
  is_default?: boolean;
}

export interface CompanySettings {
  document_settings?: {
    quotation_prefix?: string;
    po_prefix?: string;
    pi_prefix?: string;
    sales_prefix?: string;
    number_padding?: number;
    financial_year?: string;
  };
  tax_settings?: Record<string, unknown>;
  payment_settings?: Record<string, unknown>;
  bank_accounts?: BankAccount[];
  general_settings?: Record<string, unknown>;
  theme_id?: string;
}

interface CompanyContextType {
  company: Company | null;
  settings: CompanySettings | null;
  loading: boolean;
  updateCompany: (updates: Partial<Company>) => Promise<void>;
  updateSettings: (updates: Partial<CompanySettings>) => Promise<void>;
  uploadLogo: (file: File) => Promise<string>;
  refreshCompany: () => Promise<void>;
}

export interface CompanyView {
  id: string;
  name: string;
  logo: string;
  tagline: string;
  address: string;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  gstin: string;
  pan: string;
  cin: string;
  bank_name: string;
  bank_account_name: string;
  bank_account: string;
  bank_ifsc: string;
  bank_branch: string;
  bank_upi: string;
}

type CompanyRow = Company & {
  cin?: string | null;
  state_code?: string | null;
  bank_name?: string | null;
  bank_account_name?: string | null;
  bank_account_number?: string | null;
  bank_ifsc?: string | null;
  bank_branch?: string | null;
  bank_upi?: string | null;
};

const s = (v: string | null | undefined): string => v ?? '';

export function toCompanyView(row: Company | null): CompanyView {
  const c = row as CompanyRow | null;
  return {
    id: s(c?.id),
    name: s(c?.name),
    logo: s(c?.logo_url),
    tagline: s(c?.tagline),
    address: s(c?.address),
    city: s(c?.city),
    state: s(c?.state),
    stateCode: s(c?.state_code),
    pincode: s(c?.pin),
    country: s(c?.country) || 'India',
    phone: s(c?.phone),
    email: s(c?.email),
    website: s(c?.website),
    gstin: s(c?.gstin),
    pan: s(c?.pan),
    cin: s(c?.cin),
    bank_name: s(c?.bank_name),
    bank_account_name: s(c?.bank_account_name),
    bank_account: s(c?.bank_account_number),
    bank_ifsc: s(c?.bank_ifsc),
    bank_branch: s(c?.bank_branch),
    bank_upi: s(c?.bank_upi),
  };
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCompany = useCallback(async () => {
    if (!user) {
      setCompany(null);
      setSettings(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      const companyId = (profileData as { company_id: string | null } | null)?.company_id;
      if (!companyId) {
        setCompany(null);
        setSettings(null);
        return;
      }

      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (companyError) throw companyError;
      setCompany(companyData as Company);

      const { data: settingsData } = await supabase
        .from('company_settings')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      if (settingsData) {
        const s = settingsData as unknown as CompanySettings;
        setSettings({
          document_settings: s.document_settings,
          tax_settings: s.tax_settings,
          payment_settings: s.payment_settings,
          bank_accounts: s.bank_accounts,
          general_settings: s.general_settings,
          theme_id: s.theme_id,
        });
      }
    } catch (err) {
      console.error('Company load error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadCompany();
  }, [loadCompany]);

  const updateCompany = useCallback(async (updates: Partial<Company>) => {
    if (!company) return;
    const { error } = await supabase
      .from('companies')
      .update(updates)
      .eq('id', company.id);
    if (error) throw error;
    setCompany((prev) => (prev ? { ...prev, ...updates } : prev));
  }, [company]);

  const updateSettings = useCallback(async (updates: Partial<CompanySettings>) => {
    if (!company) return;
    const { error } = await supabase
      .from('company_settings')
      .update(updates)
      .eq('company_id', company.id);
    if (error) throw error;
    setSettings((prev) => ({ ...(prev ?? {}), ...updates }));
  }, [company]);

  const uploadLogo = useCallback(async (file: File): Promise<string> => {
    if (!company) throw new Error('No company loaded');

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png';
    const path = `${company.id}/logo-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('company-assets')
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from('company-assets').getPublicUrl(path);
    const logoUrl = urlData.publicUrl;

    await updateCompany({ logo_url: logoUrl });
    return logoUrl;
  }, [company, updateCompany]);

  return (
    <CompanyContext.Provider
      value={{ company, settings, loading, updateCompany, updateSettings, uploadLogo, refreshCompany: loadCompany }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}

export function useCompanyView(): CompanyView {
  const { company } = useCompany();
  return useMemo(() => toCompanyView(company), [company]);
}
