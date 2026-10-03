import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Hash, Loader2, RotateCcw, Save } from 'lucide-react';
import { BILLING_DOC_CONFIG, type BillingDocType } from '../billing.types';
import {
  listSeries,
  saveSeries,
  resetSeries,
  formatSeriesPreview,
  fiscalYearLabel,
  type DocumentSeries,
} from '../document-number.service';

type SeriesDraft = Omit<DocumentSeries, 'id' | 'company_id'>;

const DOC_TYPES: BillingDocType[] = [
  'sale',
  'purchase',
  'quotation',
  'proforma_invoice',
  'purchase_order',
];

function defaultDraft(docType: BillingDocType): SeriesDraft {
  return {
    doc_type: docType,
    prefix: BILLING_DOC_CONFIG[docType].defaultPrefix,
    financial_year: fiscalYearLabel(),
    auto_fy: true,
    start_number: 1,
    padding: 5,
    suffix: '',
    next_number: 1,
    enabled: true,
  };
}

/**
 * Settings -> Numbering. The series table owns the sequence; this screen only
 * reads and writes its configuration, and a reset is the one operation that
 * moves the counter (it asks for confirmation first).
 */
export function DocumentNumberingSettings() {
  const [drafts, setDrafts] = useState<Record<string, SeriesDraft>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const existing = await listSeries();
        if (cancelled) return;
        const next: Record<string, SeriesDraft> = {};
        for (const docType of DOC_TYPES) {
          const row = existing.find((s) => s.doc_type === docType);
          next[docType] = row
            ? {
                doc_type: row.doc_type,
                prefix: row.prefix,
                financial_year: row.financial_year,
                auto_fy: row.auto_fy,
                start_number: row.start_number,
                padding: row.padding,
                suffix: row.suffix,
                next_number: row.next_number,
                enabled: row.enabled,
              }
            : defaultDraft(docType);
        }
        setDrafts(next);
      } catch (error) {
        if (!cancelled) {
          toast({
            title: 'Could not load numbering',
            description: error instanceof Error ? error.message : 'Unknown error',
            variant: 'destructive',
          });
          const next: Record<string, SeriesDraft> = {};
          for (const docType of DOC_TYPES) next[docType] = defaultDraft(docType);
          setDrafts(next);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function patch(docType: string, partial: Partial<SeriesDraft>) {
    setDrafts((prev) => ({ ...prev, [docType]: { ...prev[docType], ...partial } }));
  }

  async function save(docType: BillingDocType) {
    setSavingKey(docType);
    try {
      const saved = await saveSeries(drafts[docType]);
      setDrafts((prev) => ({
        ...prev,
        [docType]: { ...prev[docType], next_number: saved.next_number },
      }));
      toast({ title: 'Saved', description: `${BILLING_DOC_CONFIG[docType].formTitle} numbering updated` });
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSavingKey(null);
    }
  }

  async function reset(docType: BillingDocType) {
    const raw = window.prompt(
      'Restart this series from which number? (this re-issues numbers from there)',
      '1'
    );
    if (raw === null) return;
    const target = Number.parseInt(raw, 10);
    if (!Number.isFinite(target) || target < 1) {
      toast({ title: 'Invalid number', description: 'Enter a whole number of 1 or more.', variant: 'destructive' });
      return;
    }
    try {
      const nextNumber = await resetSeries(docType, target);
      setDrafts((prev) => ({ ...prev, [docType]: { ...prev[docType], next_number: nextNumber } }));
      toast({ title: 'Series reset', description: `Next ${BILLING_DOC_CONFIG[docType].formTitle} will be #${nextNumber}` });
    } catch (error) {
      toast({
        title: 'Reset failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading numbering series...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Numbers are issued by the database when a document is saved. Previewing a form or printing
        never consumes a number.
      </p>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {DOC_TYPES.map((docType) => {
          const draft = drafts[docType];
          if (!draft) return null;
          const preview = formatSeriesPreview({ ...(draft as DocumentSeries), id: '', company_id: '' });

          return (
            <Card key={docType}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    {BILLING_DOC_CONFIG[docType].formTitle}
                  </span>
                  <label className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={draft.enabled}
                      onChange={(e) => patch(docType, { enabled: e.target.checked })}
                      className="h-4 w-4 rounded border-input"
                    />
                    Enabled
                  </label>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Prefix</Label>
                    <Input
                      value={draft.prefix}
                      onChange={(e) => patch(docType, { prefix: e.target.value })}
                      placeholder="INV/"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Financial year</Label>
                    <Input
                      value={draft.financial_year}
                      disabled={draft.auto_fy}
                      onChange={(e) => patch(docType, { financial_year: e.target.value })}
                      placeholder="26-27"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Suffix</Label>
                    <Input
                      value={draft.suffix}
                      onChange={(e) => patch(docType, { suffix: e.target.value })}
                      placeholder="(optional)"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Start number</Label>
                    <Input
                      type="number"
                      min={1}
                      value={draft.start_number}
                      onChange={(e) => patch(docType, { start_number: Number(e.target.value) || 1 })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Padding (digits)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={draft.padding}
                      onChange={(e) => patch(docType, { padding: Number(e.target.value) || 1 })}
                    />
                  </div>
                  <div className="flex items-end pb-1">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={draft.auto_fy}
                        onChange={(e) => patch(docType, { auto_fy: e.target.checked })}
                        className="h-4 w-4 rounded border-input"
                      />
                      Auto financial year
                    </label>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-dashed border-input bg-muted/40 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Next number</span>
                  <span className="font-mono font-medium">{preview}</span>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => reset(docType)}>
                    <RotateCcw className="mr-1 h-3 w-3" /> Reset
                  </Button>
                  <Button size="sm" onClick={() => save(docType)} disabled={savingKey === docType}>
                    {savingKey === docType ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <Save className="mr-1 h-3 w-3" />
                    )}
                    Save
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
