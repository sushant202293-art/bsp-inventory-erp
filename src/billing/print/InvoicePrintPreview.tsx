import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { FileDown, Printer, X } from 'lucide-react';
import { InvoicePrintTemplate } from './InvoicePrintTemplate';
import { generateInvoicePdf } from '../pdf/generateInvoicePdf';
import type { BillingPrintModel } from '../billing.types';
import './print.css';

/**
 * Full-screen A4 preview. Portalled onto <body> so print media can hide the
 * application shell (`#root`) and print only the document.
 */
export function InvoicePrintPreview({
  model,
  onClose,
}: {
  model: BillingPrintModel;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="billing-preview-backdrop" role="dialog" aria-modal="true" aria-label="Print preview">
      <div className="billing-preview-toolbar">
        <span className="truncate font-medium">
          {model.title} &middot; {model.documentNumber || 'Unsaved document'}
        </span>
        <span className="flex shrink-0 gap-2">
          <Button size="sm" variant="secondary" onClick={() => generateInvoicePdf(model)}>
            <FileDown className="mr-1 h-3.5 w-3.5" /> Download PDF
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="mr-1 h-3.5 w-3.5" /> Print
          </Button>
          <Button size="sm" variant="outline" onClick={onClose}>
            <X className="mr-1 h-3.5 w-3.5" /> Close
          </Button>
        </span>
      </div>

      <InvoicePrintTemplate model={model} />
    </div>,
    document.body
  );
}
