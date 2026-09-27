import { type ReactNode, useRef, useCallback } from 'react';
import { Printer, FileText, FileSpreadsheet, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface ReportLayoutProps {
  title: string;
  description?: string;
  filters?: ReactNode;
  children: ReactNode;
  summary?: ReactNode;
  onPrint?: () => void;
  onExportPDF?: () => void;
  onExportExcel?: () => void;
  onExportCSV?: () => void;
  className?: string;
}

export function ReportLayout({
  title,
  description,
  filters,
  children,
  summary,
  onPrint,
  onExportPDF,
  onExportExcel,
  onExportCSV,
  className,
}: ReportLayoutProps) {
  const reportRef = useRef<HTMLDivElement>(null);

  const handlePrint = useCallback(() => {
    if (onPrint) {
      onPrint();
      return;
    }
    const content = reportRef.current;
    if (!content) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
        th { background: #f3f4f6; font-weight: 600; }
        .summary { margin-top: 16px; font-weight: bold; }
        .report-title { font-size: 18px; font-weight: bold; margin-bottom: 4px; }
        .report-subtitle { font-size: 12px; color: #666; margin-bottom: 16px; }
        @media print { body { padding: 0; } }
      </style></head><body>
      <div class="report-title">${title}</div>
      ${description ? `<div class="report-subtitle">${description}</div>` : ''}
        ${content.innerHTML}
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  }, [title, description, onPrint]);

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
        <div className="flex items-center gap-2">
          {onExportCSV && (
            <Button variant="outline" size="sm" onClick={onExportCSV}>
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
          )}
          {onExportExcel && (
            <Button variant="outline" size="sm" onClick={onExportExcel}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Excel
            </Button>
          )}
          {onExportPDF && (
            <Button variant="outline" size="sm" onClick={onExportPDF}>
              <FileText className="mr-2 h-4 w-4" />
              PDF
            </Button>
          )}
          {(onPrint || !onExportPDF) && (
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          )}
        </div>
      </div>

      {filters && (
        <Card className="p-4">
          {filters}
        </Card>
      )}

      <Card className="overflow-hidden">
        <div ref={reportRef} className="overflow-x-auto">
          {children}
        </div>
      </Card>

      {summary && (
        <>
          <Separator />
          <div className="flex justify-end">
            {summary}
          </div>
        </>
      )}
    </div>
  );
}
