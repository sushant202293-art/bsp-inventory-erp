import { supabase } from '@/lib/supabase';
import type { BackupLog } from '@/types/database.types';

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

export interface BackupData {
  companies?: Record<string, unknown>[];
  products?: Record<string, unknown>[];
  customers?: Record<string, unknown>[];
  suppliers?: Record<string, unknown>[];
  transactions?: Record<string, unknown>[];
  transaction_items?: Record<string, unknown>[];
  stock_movements?: Record<string, unknown>[];
  payments_received?: Record<string, unknown>[];
  payments_made?: Record<string, unknown>[];
  customer_ledger?: Record<string, unknown>[];
  supplier_ledger?: Record<string, unknown>[];
  product_stock?: Record<string, unknown>[];
  categories?: Record<string, unknown>[];
  brands?: Record<string, unknown>[];
  units?: Record<string, unknown>[];
  warehouses?: Record<string, unknown>[];
}

export interface ImportOptions {
  overwrite?: boolean;
  skip_duplicates?: boolean;
  tables?: string[];
}

export async function exportAll(format: 'json' | 'csv' = 'json'): Promise<BackupData> {
  try {
    const companyId = await getCompanyId();

    const tables = [
      'companies',
      'products',
      'customers',
      'suppliers',
      'transactions',
      'transaction_items',
      'stock_movements',
      'payments_received',
      'payments_made',
      'customer_ledger',
      'supplier_ledger',
      'product_stock',
      'categories',
      'brands',
      'units',
      'warehouses',
    ] as const;

    const backupData: BackupData = {};

    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .eq('company_id', companyId);

        if (!error && data) {
          (backupData as Record<string, Record<string, unknown>[]>) [table] = data;
        }
      } catch {
        continue;
      }
    }

    if (format === 'json') {
      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(link.href);
    } else {
      for (const [tableName, rows] of Object.entries(backupData) as [string, Record<string, unknown>[]][]) {
        if (rows && rows.length > 0) {
          const headers = Object.keys(rows[0]);
          const csvRows = [
            headers.map((h) => `"${h}"`).join(','),
            ...rows.map((row) =>
              headers.map((h) => {
                const val = row[h];
                const str = val === null || val === undefined ? '' : String(val);
                return `"${str.replace(/"/g, '""')}"`;
              }).join(',')
            ),
          ];

          const csvContent = csvRows.join('\n');
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `${tableName}-${new Date().toISOString().split('T')[0]}.csv`;
          link.click();
          URL.revokeObjectURL(link.href);
        }
      }
    }

    const userId = await getCurrentUserId();
    await supabase
      .from('backup_logs')
      .insert({
        company_id: companyId,
        type: 'export',
        format,
        file_name: `backup-${new Date().toISOString().split('T')[0]}.${format}`,
        status: 'completed',
        records_count: Object.values(backupData).reduce(
          (sum, rows) => sum + (rows?.length || 0),
          0
        ),
        created_by: userId,
      });

    return backupData;
  } catch (error) {
    throw new Error(`Failed to export data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function importData(
  data: BackupData,
  options: ImportOptions = {}
): Promise<{ imported: number; skipped: number; errors: string[] }> {
  try {
    const companyId = await getCompanyId();
    const userId = await getCurrentUserId();
    const errors: string[] = [];
    let imported = 0;
    let skipped = 0;

    const allowedTables = options.tables || Object.keys(data);
    const tablesToImport = allowedTables.filter((t) => {
      const rows = (data as Record<string, Record<string, unknown>[]>) [t];
      return rows && rows.length > 0;
    });

    for (const table of tablesToImport) {
      const rows = (data as Record<string, Record<string, unknown>[]>) [table];
      if (!rows || rows.length === 0) continue;

      try {
        const rowsWithCompany = rows.map((row) => ({
          ...row,
          company_id: companyId,
        }));

        if (options.overwrite) {
          await supabase.from(table).delete().eq('company_id', companyId);
        }

        const batchSize = 50;
        for (let i = 0; i < rowsWithCompany.length; i += batchSize) {
          const batch = rowsWithCompany.slice(i, i + batchSize);
          const { error } = await supabase
            .from(table)
            .upsert(batch, {
              onConflict: options.skip_duplicates ? undefined : 'id',
              ignoreDuplicates: options.skip_duplicates || false,
            });

          if (error) {
            errors.push(`Table "${table}" batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
          } else {
            imported += batch.length;
          }
        }
      } catch (e) {
        errors.push(`Table "${table}": ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    }

    await supabase
      .from('backup_logs')
      .insert({
        company_id: companyId,
        type: 'import',
        format: 'json',
        status: errors.length > 0 ? 'failed' : 'completed',
        records_count: imported,
        created_by: userId,
      });

    return { imported, skipped, errors };
  } catch (error) {
    throw new Error(`Failed to import data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getBackupLogs(): Promise<BackupLog[]> {
  try {
    const companyId = await getCompanyId();

    const { data, error } = await supabase
      .from('backup_logs')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as BackupLog[];
  } catch (error) {
    throw new Error(`Failed to fetch backup logs: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}


export const backupService = {
  exportAll,
  importData,
  getBackupLogs,
};

