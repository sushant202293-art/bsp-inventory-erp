import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye } from 'lucide-react';

interface Props {
  title: string;
  /** Read-only preview - the real number is minted in the database on save. */
  docNumber: string;
  docNumberLoading?: boolean;
  docDate: string;
  onDocDateChange: (value: string) => void;
  extraDate?: {
    label: string;
    value: string;
    onChange: (value: string) => void;
  } | null;
  referenceNumber?: string;
  onReferenceNumberChange?: (value: string) => void;
  status?: string;
}

/** Document identity strip: number preview, dates, reference, status. */
export function DocumentHeaderBar({
  title,
  docNumber,
  docNumberLoading = false,
  docDate,
  onDocDateChange,
  extraDate,
  referenceNumber,
  onReferenceNumberChange,
  status,
}: Props) {
  return (
    <Card>
      <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-4">
        <div className="space-y-2">
          <Label>Document Number</Label>
          <div className="flex h-9 items-center gap-2 rounded border border-dashed border-input bg-muted/40 px-3 font-mono text-sm">
            {docNumberLoading ? 'Generating...' : docNumber || '—'}
            {!docNumberLoading ? <Eye className="h-3 w-3 text-muted-foreground" /> : null}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Preview only. The final number is issued when the document is saved.
          </p>
        </div>

        <div className="space-y-2">
          <Label>{title} Date</Label>
          <Input type="date" value={docDate} onChange={(e) => onDocDateChange(e.target.value)} />
        </div>

        {extraDate ? (
          <div className="space-y-2">
            <Label>{extraDate.label}</Label>
            <Input type="date" value={extraDate.value} onChange={(e) => extraDate.onChange(e.target.value)} />
          </div>
        ) : null}

        <div className="space-y-2">
          <Label>Reference No.</Label>
          <Input
            value={referenceNumber ?? ''}
            onChange={(e) => onReferenceNumberChange?.(e.target.value)}
            placeholder="PO / copy ref (optional)"
            disabled={!onReferenceNumberChange}
          />
          {status ? (
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Status: {status}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
