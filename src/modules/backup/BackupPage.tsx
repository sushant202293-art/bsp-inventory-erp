import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { backupService } from '@/services/backup.service';
import { formatDate } from '@/lib/utils';
import { Download, Upload, FileJson, FileSpreadsheet, Clock } from 'lucide-react';

export default function BackupPage() {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => { loadLogs(); }, []);

  async function loadLogs() {
    try { const data = await backupService.getBackupLogs(); setLogs(data || []); } catch {}
  }

  async function exportData(format: 'json' | 'csv') {
    setLoading(true);
    try {
      const data = await backupService.exportAll(format);
      const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bsp-backup-${new Date().toISOString().split('T')[0]}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Exported', description: `Backup exported as ${format.toUpperCase()}` });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  }

  async function importFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await backupService.importData(data, {});
      toast({ title: 'Imported', description: 'Data imported successfully' });
      loadLogs();
    } catch (e: any) {
      toast({ title: 'Import Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  }

  const modules = ['Products', 'Customers', 'Suppliers', 'Transactions', 'Stock Movements', 'Payments', 'Settings'];

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-lg font-bold">Backup & Import/Export</h1>
        <p className="text-sm text-muted-foreground">Export, import, and backup your business data</p>
      </div>

      <Tabs defaultValue="export">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="export"><Download className="mr-1 h-4 w-4" /> Export</TabsTrigger>
          <TabsTrigger value="import"><Upload className="mr-1 h-4 w-4" /> Import</TabsTrigger>
          <TabsTrigger value="history"><Clock className="mr-1 h-4 w-4" /> History</TabsTrigger>
        </TabsList>

        <TabsContent value="export" className="space-y-3">
          <Card>
            <CardHeader><CardTitle>Full Backup</CardTitle></CardHeader>
            <CardContent className="flex gap-3">
              <Button onClick={() => exportData('json')} disabled={loading}><FileJson className="mr-2 h-4 w-4" /> Export JSON</Button>
              <Button variant="outline" onClick={() => exportData('csv')} disabled={loading}><FileSpreadsheet className="mr-2 h-4 w-4" /> Export CSV</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Module-wise Export</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {modules.map((m) => (
                <Button key={m} variant="outline" disabled={loading} onClick={() => exportData('json')}>
                  <Download className="mr-1 h-3 w-3" /> {m}
                </Button>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import">
          <Card>
            <CardHeader><CardTitle>Import Data</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Upload a JSON backup file to import data. The system validates before importing.</p>
              <label className="cursor-pointer">
                <input type="file" accept=".json" className="hidden" onChange={importFile} />
                <Button disabled={loading}><Upload className="mr-2 h-4 w-4" /> {loading ? 'Importing...' : 'Choose File'}</Button>
              </label>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader><CardTitle>Backup History</CardTitle></CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No backup history yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead><tr className="border-b"><th className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-left">Date</th><th className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-left">Type</th><th className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-left">Format</th><th className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-left">Status</th><th className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-right">Records</th></tr></thead>
                    <tbody>
                      {logs.map((log) => (
                        <tr key={log.id} className="border-b">
                          <td className="px-2.5 py-1.5">{formatDate(log.created_at)}</td>
                          <td className="px-2.5 py-1.5 capitalize">{log.type}</td>
                          <td className="px-2.5 py-1.5 uppercase">{log.format}</td>
                          <td className="px-2.5 py-1.5"><Badge variant={log.status === 'success' ? 'success' : 'destructive'}>{log.status}</Badge></td>
                          <td className="px-2.5 py-1.5 text-right">{log.records_count || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
