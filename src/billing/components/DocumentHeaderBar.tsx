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

/**
 * Document identity strip: number, dates, reference and status on a single
 * compact horizontal row (~58px) so the party blocks and the items grid keep
 * the viewport.
 */
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
    <Card className="rounded-lg">
      <CardContent className="grid grid-cols-1 gap-x-3 gap-y-1.5 p-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="min-w-0">
          <Label className="block text-[10px] leading-none text-muted-foreground">Document Number</Label>
          <div
            title="Preview only. The final number is issued when the document is saved."
            className="mt-1 flex h-7 items-center gap-2 overflow-hidden rounded border border-dashed border-input bg-muted/40 px-2 font-mono text-[12px] whitespace-nowrap"
          >
            <span className="truncate">{docNumberLoading ? 'Generating...' : docNumber || '—'}</span>
            {!docNumberLoading ? <Eye className="h-3 w-3 shrink-0 text-muted-foreground" /> : null}
          </div>
        </div>

        <div className="min-w-0">
          <Label className="block text-[10px] leading-none text-muted-foreground">{title} Date</Label>
          <Input
            type="date"
            value={docDate}
            onChange={(e) => onDocDateChange(e.target.value)}
            className="mt-1 h-7 text-[12px]"
          />
        </div>

        {extraDate ? (
          <div className="min-w-0">
            <Label className="block text-[10px] leading-none text-muted-foreground">{extraDate.label}</Label>
            <Input
              type="date"
              value={extraDate.value}
              onChange={(e) => extraDate.onChange(e.target.value)}
              className="mt-1 h-7 text-[12px]"
            />
          </div>
        ) : null}

        <div className="min-w-0">
          <Label className="flex items-center justify-between gap-2 text-[10px] leading-none text-muted-foreground">
            <span>Reference No.</span>
            {status ? <span className="truncate uppercase">{status}</span> : null}
          </Label>
          <Input
            value={referenceNumber ?? ''}
            onChange={(e) => onReferenceNumberChange?.(e.target.value)}
            placeholder="PO / copy ref (optional)"
            disabled={!onReferenceNumberChange}
            className="mt-1 h-7 text-[12px]"
          />
        </div>
      </CardContent>
    </Card>
  );
}
