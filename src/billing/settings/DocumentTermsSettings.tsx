import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Save } from 'lucide-react';
import { BILLING_DOC_CONFIG, type BillingDocType } from '../billing.types';
import { loadBillingConfig, saveDocumentTerms, termsFor } from '../billing-config.service';

const DOC_TYPES: BillingDocType[] = [
  'sale',
  'purchase',
  'quotation',
  'proforma_invoice',
  'purchase_order',
];

/** Settings -> Terms: the default Terms & Conditions prefilled on each form. */
export function DocumentTermsSettings() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadBillingConfig()
      .then((config) => {
        if (cancelled) return;
        const next: Record<string, string> = {};
        for (const docType of DOC_TYPES) next[docType] = termsFor(config, docType);
        setValues(next);
      })
      .catch((error) => {
        if (!cancelled) {
          toast({
            title: 'Could not load terms',
            description: error instanceof Error ? error.message : 'Unknown error',
            variant: 'destructive',
          });
          const next: Record<string, string> = {};
          for (const docType of DOC_TYPES) next[docType] = termsFor(null, docType);
          setValues(next);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    setSaving(true);
    try {
      await saveDocumentTerms(values as Partial<Record<BillingDocType, string>>);
      toast({ title: 'Saved', description: 'Default terms updated for all documents' });
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading terms...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Prefilled when a document is opened. You can still edit the text on an individual
          document before saving.
        </p>
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Save className="mr-1 h-3 w-3" />}
          Save terms
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {DOC_TYPES.map((docType) => (
          <Card key={docType}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{BILLING_DOC_CONFIG[docType].formTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label className="sr-only" htmlFor={`terms-${docType}`}>
                Terms for {BILLING_DOC_CONFIG[docType].formTitle}
              </Label>
              <Textarea
                id={`terms-${docType}`}
                rows={8}
                value={values[docType] || ''}
                onChange={(e) => setValues((prev) => ({ ...prev, [docType]: e.target.value }))}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
