import { supabase } from '@/lib/supabase';
import { getCompanyId } from '@/lib/tenant';
import type { BillingDocType } from './billing.types';

/**
 * Document numbering.
 *
 * The database owns the sequence (`document_series` + the RPCs in migration
 * 009). The browser only ever *reads* a preview: opening a form, refreshing,
 * or opening Print Preview twenty times must not burn a single number.
 * Numbers are handed out by `allocate_document_number`, which the service
 * layer calls inside the insert of a brand-new document.
 */

export interface DocumentSeries {
  id: string;
  company_id: string;
  doc_type: BillingDocType;
  prefix: string;
  financial_year: string;
  auto_fy: boolean;
  start_number: number;
  padding: number;
  suffix: string;
  next_number: number;
  enabled: boolean;
}

/** The number a brand-new document *would* receive. Read-only. */
export async function previewDocumentNumber(
  docType: BillingDocType,
  docDate?: string
): Promise<string> {
  const companyId = await getCompanyId();
  const { data, error } = await supabase.rpc('preview_document_number', {
    p_company_id: companyId,
    p_doc_type: docType,
    p_doc_date: docDate || null,
  });
  if (error) throw new Error(error.message);
  return String(data);
}

export async function listSeries(): Promise<DocumentSeries[]> {
  const companyId = await getCompanyId();
  const { data, error } = await supabase
    .from('document_series')
    .select('*')
    .eq('company_id', companyId)
    .order('doc_type');
  if (error) throw new Error(error.message);
  return (data || []) as DocumentSeries[];
}

/** Creates or updates one series. Enforced by RLS as settings:update. */
export async function saveSeries(
  series: Omit<DocumentSeries, 'id' | 'company_id'>
): Promise<DocumentSeries> {
  const companyId = await getCompanyId();
  const { data, error } = await supabase
    .from('document_series')
    .upsert(
      { ...series, company_id: companyId },
      { onConflict: 'company_id,doc_type' }
    )
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as DocumentSeries;
}

/** Manual restart, e.g. when a new financial year begins. */
export async function resetSeries(
  docType: BillingDocType,
  nextNumber?: number,
  financialYear?: string
): Promise<number> {
  const companyId = await getCompanyId();
  const { data, error } = await supabase.rpc('reset_document_series', {
    p_company_id: companyId,
    p_doc_type: docType,
    p_next_number: nextNumber ?? null,
    p_financial_year: financialYear ?? null,
  });
  if (error) throw new Error(error.message);
  return Number(data);
}

/** Formats a number without touching the database - used by the preview box. */
export function formatSeriesPreview(series: DocumentSeries): string {
  const sequence = Math.max(series.start_number, series.next_number);
  return (
    (series.prefix || '') +
    (series.financial_year || '') +
    '/' +
    String(sequence).padStart(Math.max(series.padding, 1), '0') +
    (series.suffix || '')
  );
}

/** Indian financial year label for a date, e.g. 2026-06-01 -> '26-27'. */
export function fiscalYearLabel(date: string | Date = new Date()): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const startYY = month >= 4 ? year : year - 1;
  const endYY = (startYY + 1) % 100;
  return `${String(startYY % 100).padStart(2, '0')}-${String(endYY).padStart(2, '0')}`;
}

export const documentNumberService = {
  previewDocumentNumber,
  listSeries,
  saveSeries,
  resetSeries,
  formatSeriesPreview,
  fiscalYearLabel,
};
