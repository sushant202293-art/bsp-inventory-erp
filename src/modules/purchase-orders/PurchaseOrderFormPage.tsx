import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Save,
  Printer,
  Plus,
  Trash2,
  Search,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { useCompanyView } from '@/contexts/CompanyContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  getTransaction,
  createTransaction,
  updateTransaction,
  getNextDocumentNumber,
  printTransaction,
} from '@/services/transaction.service';
import { ProductAutocomplete } from '@/billing/components/ProductAutocomplete';
import { getSuppliers, createSupplier } from '@/services/supplier.service';
import type { TransactionItemFormData } from '@/types/transaction.types';
import type { ProductWithRelations } from '@/types/product.types';
import type { SupplierWithRelations } from '@/types/supplier.types';
import {
  formatCurrency,
  formatDate,
  amountInWords,
  isSameState,
} from '@/lib/utils';

const DEFAULT_TERMS = `1. Goods must be delivered as per the purchase order specifications.
2. Any damage or shortage must be reported within 7 days of delivery.
3. Payment will be processed as per agreed credit terms.
4. Goods remain property of the company until full payment is received.
5. Late delivery may result in order cancellation.`;

export default function PurchaseOrderFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const company = useCompanyView();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState<SupplierWithRelations[]>([]);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showSupplierSearch, setShowSupplierSearch] = useState(false);
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);

  const [formData, setFormData] = useState({
    document_number: '',
    document_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: '',
    reference_number: '',
    supplier_id: '',
    supplier_name: '',
    supplier_gstin: '',
    supplier_address: '',
    supplier_state: '',
    notes: '',
    terms: DEFAULT_TERMS,
    status: 'draft' as 'draft' | 'confirmed' | 'cancelled',
  });

  const [items, setItems] = useState<TransactionItemFormData[]>([
    createEmptyItem(),
  ]);

  const [newSupplier, setNewSupplier] = useState({
    name: '',
    code: '',
    gstin: '',
    contact_person: '',
    phone: '',
    email: '',
    billing_address: { line1: '', line2: '', city: '', state: '', pin: '', country: 'India' },
    same_as_billing: true,
    is_active: true,
    credit_limit: 0,
    credit_period: 30,
    opening_balance: 0,
    opening_balance_type: 'debit' as 'debit' | 'credit',
    payment_terms: '',
    bank_details: { bank_name: '', account_number: '', ifsc_code: '', branch: '' },
    notes: '',
  });

  function createEmptyItem(): TransactionItemFormData {
    return {
      product_id: null,
      product_name: '',
      product_code: '',
      brand_name: '',
      quantity: 1,
      unit: 'NOS',
      rate: 0,
      discount_percent: 0,
      discount_amount: 0,
      gst_rate: 18,
      sort_order: 0,
    };
  }

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (id) {
      loadTransaction(id);
    }
  }, [id]);

  async function loadInitialData() {
    try {
      const [docNum, supplierResult] = await Promise.all([
        getNextDocumentNumber('purchase_order'),
        getSuppliers({}, 1, 500),
      ]);
      setFormData((prev) => ({ ...prev, document_number: docNum }));
      setSuppliers(supplierResult.suppliers);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load data',
        variant: 'destructive',
      });
    }
  }

  async function loadTransaction(txnId: string) {
    try {
      setLoading(true);
      const txn = await getTransaction(txnId);
      setFormData({
        document_number: txn.document_number,
        document_date: txn.document_date,
        expected_delivery_date: (txn as unknown as { expected_delivery_date?: string }).expected_delivery_date || '',
        reference_number: txn.reference_number || '',
        supplier_id: txn.supplier_id || '',
        supplier_name: txn.supplier?.name || '',
        supplier_gstin: txn.supplier?.gstin || '',
        supplier_address: txn.supplier?.billing_address
          ? `${txn.supplier.billing_address.line1}, ${txn.supplier.billing_address.city}, ${txn.supplier.billing_address.state} - ${txn.supplier.billing_address.pin}`
          : '',
        supplier_state: txn.supplier?.billing_address?.state || '',
        notes: txn.notes || '',
        terms: txn.terms || DEFAULT_TERMS,
        status: txn.status as 'draft' | 'confirmed' | 'cancelled',
      });

      if (txn.items && txn.items.length > 0) {
        setItems(
          txn.items.map((item) => ({
            id: item.id,
            product_id: item.product_id,
            product_name: item.product_name,
            product_code: item.product_code || '',
            brand_name: item.brand_name || '',
            quantity: item.quantity,
            unit: item.unit || 'NOS',
            rate: item.rate,
            discount_percent: item.discount_percent,
            discount_amount: item.discount_amount,
            gst_rate: item.gst_rate,
            sort_order: item.sort_order,
          }))
        );
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load purchase order',
        variant: 'destructive',
      });
      navigate('/purchase-orders');
    } finally {
      setLoading(false);
    }
  }

  function selectSupplier(supplier: SupplierWithRelations) {
    setFormData((prev) => ({
      ...prev,
      supplier_id: supplier.id,
      supplier_name: supplier.name,
      supplier_gstin: supplier.gstin || '',
      supplier_address: supplier.billing_address
        ? `${supplier.billing_address.line1}, ${supplier.billing_address.city}, ${supplier.billing_address.state} - ${supplier.billing_address.pin}`
        : '',
      supplier_state: supplier.billing_address?.state || '',
    }));
    setSuppliers((prev) => prev.map((s) => (s.id === supplier.id ? { ...s, _selected: true } : { ...s, _selected: false })));
    setShowSupplierSearch(false);
    setSupplierSearch('');
  }

  function selectProduct(product: ProductWithRelations, index: number) {
    const updatedItems = [...items];
    updatedItems[index] = {
      ...updatedItems[index],
      product_id: product.id,
      product_name: product.name,
      product_code: product.code,
      brand_name: product.brand?.name || '',
      rate: product.purchase_price,
      gst_rate: product.gst_rate,
      unit: (product.unit as unknown as { short_name?: string })?.short_name || 'NOS',
    };
    setItems(updatedItems);
  }

  /** Free typing invalidates the link to the product master, as in billing. */
  function setProductName(index: number, text: string) {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], product_name: text, product_id: null };
    setItems(updatedItems);
  }

  function updateItem(index: number, field: keyof TransactionItemFormData, value: unknown) {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    if (field === 'quantity' || field === 'rate' || field === 'discount_percent') {
      const item = updatedItems[index];
      const lineTotal = item.quantity * item.rate;
      if (item.discount_percent > 0) {
        updatedItems[index].discount_amount = Math.round((lineTotal * item.discount_percent) / 100 * 100) / 100;
      }
    }
    setItems(updatedItems);
  }

  function removeItem(index: number) {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  }

  function addItem() {
    setItems([...items, { ...createEmptyItem(), sort_order: items.length }]);
  }

  function calculateItemTotals(item: TransactionItemFormData) {
    const lineTotal = item.quantity * item.rate;
    const discountAmt = item.discount_percent > 0
      ? Math.round((lineTotal * item.discount_percent) / 100 * 100) / 100
      : item.discount_amount;
    const taxableValue = lineTotal - discountAmt;
    const intraState = isSameState(company.state, formData.supplier_state);
    const halfRate = item.gst_rate / 2;
    const cgst = intraState ? Math.round((taxableValue * halfRate) / 100 * 100) / 100 : 0;
    const sgst = intraState ? Math.round((taxableValue * halfRate) / 100 * 100) / 100 : 0;
    const igst = !intraState ? Math.round((taxableValue * item.gst_rate) / 100 * 100) / 100 : 0;
    const totalAmount = taxableValue + cgst + sgst + igst;
    return { lineTotal, discountAmt, taxableValue, cgst, sgst, igst, totalAmount };
  }

  function calculateTotals() {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalIGST = 0;

    items.forEach((item) => {
      const { lineTotal, discountAmt, taxableValue, cgst, sgst, igst } = calculateItemTotals(item);
      subtotal += lineTotal;
      totalDiscount += discountAmt;
      totalCGST += cgst;
      totalSGST += sgst;
      totalIGST += igst;
    });

    const taxableAmount = subtotal - totalDiscount;
    const totalTax = totalCGST + totalSGST + totalIGST;
    const preRound = taxableAmount + totalTax;
    const rounded = Math.round(preRound);
    const roundOff = Math.round((rounded - preRound) * 100) / 100;
    const grandTotal = rounded;

    return {
      totalQty: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal,
      totalDiscount,
      taxableAmount,
      totalCGST,
      totalSGST,
      totalIGST,
      totalTax,
      roundOff,
      grandTotal,
    };
  }

  const totals = calculateTotals();

  async function handleSave(status: 'draft' | 'confirmed' = 'draft', print = false) {
    if (!formData.supplier_id) {
      toast({ title: 'Validation Error', description: 'Please select a supplier', variant: 'destructive' });
      return;
    }

    const validItems = items.filter((item) => item.product_name && item.quantity > 0 && item.rate > 0);
    if (validItems.length === 0) {
      toast({ title: 'Validation Error', description: 'Please add at least one valid item', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const data = {
        type: 'purchase_order' as const,
        document_number: formData.document_number,
        document_date: formData.document_date,
        reference_number: formData.reference_number,
        supplier_id: formData.supplier_id,
        billing_address: null,
        shipping_address: null,
        items: validItems.map((item, idx) => ({ ...item, sort_order: idx + 1 })),
        discount_amount: 0,
        round_off: totals.roundOff,
        notes: formData.notes,
        terms: formData.terms,
        status,
      };

      if (isEdit && id) {
        await updateTransaction(id, data);
      } else {
        await createTransaction(data);
      }

      toast({
        title: 'Success',
        description: `Purchase Order ${isEdit ? 'updated' : 'created'} successfully`,
        variant: 'success',
      });

      if (print) {
        setTimeout(() => handlePrint(), 500);
      } else {
        navigate('/purchase-orders');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save purchase order',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handlePrint() {
    setPrintLoading(true);
    try {
      const txnId = id || '';
      if (!txnId) {
        toast({ title: 'Info', description: 'Please save the PO first before printing', variant: 'info' });
        return;
      }
      const printData = await printTransaction(txnId);
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;
      printWindow.document.write(`<!DOCTYPE html><html><head><title>PO ${printData.transaction.document_number}</title>
        <style>body{font-family:Arial,sans-serif;margin:20px;font-size:12px}table{width:100%;border-collapse:collapse}h2,h3{margin:0}</style></head><body>
        <div style="text-align:center;border-bottom:2px solid #333;padding-bottom:10px;margin-bottom:20px">
          <h2>${printData.company.name}</h2><p style="margin:2px 0">${printData.company.address}</p>
          <p style="margin:2px 0">GSTIN: ${printData.company.gstin} | Phone: ${printData.company.phone}</p>
        </div>
        <h3 style="text-align:center;margin-bottom:15px">PURCHASE ORDER</h3>
        <p><strong>PO No:</strong> ${printData.transaction.document_number} | <strong>Date:</strong> ${formatDate(printData.transaction.document_date)} | <strong>Ref:</strong> ${printData.transaction.reference_number || '-'}</p>
        <p><strong>Supplier:</strong> ${printData.transaction.supplier?.name || '-'} | <strong>GSTIN:</strong> ${printData.transaction.supplier?.gstin || '-'}</p>
        <p><strong>Amount:</strong> ${formatCurrency(printData.transaction.grand_total)} (${printData.amount_in_words})</p>
        <div style="margin-top:30px;text-align:center"><p>For ${company.name}</p><br/><br/><p>Authorized Signatory</p></div>
        <p style="margin-top:20px;font-size:10px;color:#666;text-align:center">This is a computer generated Purchase Order and does not require a signature.</p>
        </body></html>`);
      printWindow.document.close();
      printWindow.print();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to print',
        variant: 'destructive',
      });
    } finally {
      setPrintLoading(false);
    }
  }

  async function handleCreateSupplier() {
    if (!newSupplier.name) {
      toast({ title: 'Validation Error', description: 'Supplier name is required', variant: 'destructive' });
      return;
    }
    try {
      const created = await createSupplier(newSupplier);
      setSuppliers((prev) => [...prev, created as SupplierWithRelations]);
      setFormData((prev) => ({
        ...prev,
        supplier_id: created.id,
        supplier_name: created.name,
        supplier_gstin: created.gstin || '',
        supplier_address: created.billing_address
          ? `${created.billing_address.line1}, ${created.billing_address.city}, ${created.billing_address.state} - ${created.billing_address.pin}`
          : '',
        supplier_state: created.billing_address?.state || '',
      }));
      setShowNewSupplier(false);
      setNewSupplier({
        name: '', code: '', gstin: '', contact_person: '', phone: '', email: '',
        billing_address: { line1: '', line2: '', city: '', state: '', pin: '', country: 'India' },
        same_as_billing: true, is_active: true, credit_limit: 0, credit_period: 30,
        opening_balance: 0, opening_balance_type: 'debit', payment_terms: '',
        bank_details: { bank_name: '', account_number: '', ifsc_code: '', branch: '' }, notes: '',
      });
      toast({ title: 'Success', description: 'Supplier created successfully', variant: 'success' });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create supplier',
        variant: 'destructive',
      });
    }
  }

  const filteredSuppliers = suppliers.filter((s) =>
    s.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
    (s.code && s.code.toLowerCase().includes(supplierSearch.toLowerCase()))
  );

  const intraState = isSameState(company.state, formData.supplier_state);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-2 text-sm text-muted-foreground">Loading purchase order...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-2"
    >
      <PageHeader
        title={isEdit ? 'Edit Purchase Order' : 'New Purchase Order'}
        description={`${isEdit ? 'Update' : 'Create'} a purchase order`}
        breadcrumbs={[
          { label: 'Home', onClick: () => navigate('/') },
          { label: 'Purchase Orders', onClick: () => navigate('/purchase-orders') },
          { label: isEdit ? 'Edit' : 'New' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/purchase-orders')} disabled={saving}>
              Cancel
            </Button>
            <Button variant="outline" onClick={() => handleSave('draft', true)} disabled={saving}>
              <Printer className="mr-2 h-4 w-4" />
              {printLoading ? 'Printing...' : 'Save & Print'}
            </Button>
            <Button onClick={() => handleSave('draft')} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Save Draft'}
            </Button>
          </div>
        }
      />

      {/* Document Header */}
      <div className="grid grid-cols-1 gap-x-3 gap-y-1.5 md:grid-cols-4">
        <div>
          <label className="block text-[10px] leading-none text-muted-foreground">PO Number</label>
          <Input value={formData.document_number} disabled className="mt-1 h-7 bg-muted text-[12px]" />
        </div>
        <div>
          <label className="block text-[10px] leading-none text-muted-foreground">PO Date *</label>
          <Input
            type="date"
            value={formData.document_date}
            onChange={(e) => setFormData({ ...formData, document_date: e.target.value })}
            className="mt-1 h-7 text-[12px]"
          />
        </div>
        <div>
          <label className="block text-[10px] leading-none text-muted-foreground">Expected Delivery Date</label>
          <Input
            type="date"
            value={formData.expected_delivery_date}
            onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
            className="mt-1 h-7 text-[12px]"
          />
        </div>
        <div>
          <label className="block text-[10px] leading-none text-muted-foreground">Reference</label>
          <Input
            value={formData.reference_number}
            onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
            placeholder="Reference number"
            className="mt-1 h-7 text-[12px]"
          />
        </div>
      </div>

      {/* Consignee + Supplier, side by side so the items grid starts early */}
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        <Card className="p-2.5">
          <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Consignee (Company)
          </h3>
          <div className="grid grid-cols-1 gap-x-3 text-[12px] leading-snug md:grid-cols-2">
            <div className="min-w-0">
              <p className="truncate font-medium">{company.name}</p>
              <p className="truncate text-muted-foreground">{company.address}</p>
              <p className="truncate text-muted-foreground">
                {company.city}, {company.state} - {company.pincode}
              </p>
            </div>
            <div className="min-w-0">
              <p className="truncate text-muted-foreground">GSTIN: {company.gstin}</p>
              <p className="truncate text-muted-foreground">Phone: {company.phone}</p>
              <p className="truncate text-muted-foreground">Email: {company.email}</p>
            </div>
          </div>
        </Card>

        <Card className="p-2.5">
          <div className="mb-1 flex items-center justify-between gap-2">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Supplier</h3>
            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" className="h-6 px-2 text-[11px]" onClick={() => setShowSupplierSearch(true)}>
                <Search className="mr-1 h-3 w-3" />
                Select Supplier
              </Button>
              <Button variant="outline" size="sm" className="h-6 px-2 text-[11px]" onClick={() => setShowNewSupplier(true)}>
                <Plus className="mr-1 h-3 w-3" />
                New Supplier
              </Button>
            </div>
          </div>

          {formData.supplier_name ? (
            <div className="grid grid-cols-1 gap-x-3 text-[12px] leading-snug md:grid-cols-2">
              <div className="min-w-0">
                <p className="truncate font-medium">{formData.supplier_name}</p>
                <p className="truncate text-muted-foreground">
                  {formData.supplier_address || 'No address provided'}
                </p>
              </div>
              <div className="min-w-0">
                <p className="truncate text-muted-foreground">GSTIN: {formData.supplier_gstin || 'N/A'}</p>
                <p className="truncate text-muted-foreground">State: {formData.supplier_state || 'N/A'}</p>
                <p className="truncate text-muted-foreground">
                  Tax: {intraState ? 'Intra-State (CGST + SGST)' : 'Inter-State (IGST)'}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-[12px] text-muted-foreground">
              No supplier selected. Click &ldquo;Select Supplier&rdquo; to choose.
            </p>
          )}
        </Card>
      </div>

      {/* Items Grid */}
      <Card className="p-2.5">
        <div className="mb-1.5 flex items-center justify-between">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Items</h3>
          <Button variant="outline" size="sm" className="h-7 px-2 text-[11px]" onClick={addItem}>
            <Plus className="mr-1 h-3 w-3" />
            Add Item
          </Button>
        </div>

        <div className="overflow-x-auto lg:min-h-[600px]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-2 py-1.5 text-left text-xs font-medium text-muted-foreground w-10">Sl</th>
                <th className="px-2 py-1.5 text-left text-xs font-medium text-muted-foreground w-28">Code</th>
                <th className="px-2 py-1.5 text-left text-xs font-medium text-muted-foreground">Item Name</th>
                <th className="px-2 py-1.5 text-left text-xs font-medium text-muted-foreground w-20">Brand</th>
                <th className="px-2 py-1.5 text-right text-xs font-medium text-muted-foreground w-16">Qty</th>
                <th className="px-2 py-1.5 text-left text-xs font-medium text-muted-foreground w-14">Unit</th>
                <th className="px-2 py-1.5 text-right text-xs font-medium text-muted-foreground w-24">Rate</th>
                <th className="px-2 py-1.5 text-right text-xs font-medium text-muted-foreground w-16">Disc%</th>
                <th className="px-2 py-1.5 text-right text-xs font-medium text-muted-foreground w-24">Disc Amt</th>
                <th className="px-2 py-1.5 text-right text-xs font-medium text-muted-foreground w-28">Taxable</th>
                <th className="px-2 py-1.5 text-right text-xs font-medium text-muted-foreground w-16">GST%</th>
                <th className="px-2 py-1.5 text-right text-xs font-medium text-muted-foreground w-20">
                  {intraState ? 'CGST' : 'IGST'}
                </th>
                <th className="px-2 py-1.5 text-right text-xs font-medium text-muted-foreground w-20">
                  {intraState ? 'SGST' : ''}
                </th>
                <th className="px-2 py-1.5 text-right text-xs font-medium text-muted-foreground w-28">Total</th>
                <th className="px-2 py-1.5 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const totals = calculateItemTotals(item);
                return (
                  <tr key={index} className="border-b border-border last:border-0">
                    <td className="px-2 py-1.5 text-center text-muted-foreground">{index + 1}</td>
                    <td className="px-2 py-1.5">
                      <Input
                        value={item.product_code}
                        onChange={(e) => updateItem(index, 'product_code', e.target.value)}
                        className="h-7 text-xs"
                        placeholder="Code"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <ProductAutocomplete
                        value={item.product_name}
                        priceField="purchase_price"
                        placeholder="Search product by name, code or brand..."
                        className="min-w-[16rem]"
                        onChange={(text) => setProductName(index, text)}
                        onSelect={(product) => selectProduct(product, index)}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        value={item.brand_name}
                        onChange={(e) => updateItem(index, 'brand_name', e.target.value)}
                        className="h-7 text-xs"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        className="h-7 text-xs text-right"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        value={item.unit}
                        onChange={(e) => updateItem(index, 'unit', e.target.value)}
                        className="h-7 text-xs"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.rate}
                        onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value) || 0)}
                        className="h-7 text-xs text-right"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={item.discount_percent}
                        onChange={(e) => updateItem(index, 'discount_percent', parseFloat(e.target.value) || 0)}
                        className="h-7 text-xs text-right"
                      />
                    </td>
                    <td className="px-2 py-1.5 text-right text-xs text-muted-foreground">
                      {formatCurrency(totals.discountAmt)}
                    </td>
                    <td className="px-2 py-1.5 text-right text-xs">
                      {formatCurrency(totals.taxableValue)}
                    </td>
                    <td className="px-2 py-1.5">
                      <Select
                        value={String(item.gst_rate)}
                        onValueChange={(val) => updateItem(index, 'gst_rate', parseFloat(val))}
                      >
                        <SelectTrigger className="h-7 text-xs w-16">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[0, 5, 12, 18, 28].map((rate) => (
                            <SelectItem key={rate} value={String(rate)}>
                              {rate}%
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-2 py-1.5 text-right text-xs text-muted-foreground">
                      {formatCurrency(intraState ? totals.cgst : totals.igst)}
                    </td>
                    <td className="px-2 py-1.5 text-right text-xs text-muted-foreground">
                      {intraState ? formatCurrency(totals.sgst) : ''}
                    </td>
                    <td className="px-2 py-1.5 text-right text-xs font-semibold">
                      {formatCurrency(totals.totalAmount)}
                    </td>
                    <td className="px-2 py-1.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => removeItem(index)}
                        disabled={items.length <= 1}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Totals & Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Notes */}
        <div className="lg:col-span-2 space-y-3">
          <Card className="p-3">
            <h3 className="text-sm font-semibold mb-2">Notes</h3>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full h-20 rounded-md border border-border bg-transparent px-3 py-2 text-sm resize-none"
              placeholder="Additional notes..."
            />
          </Card>

          <Card className="p-3">
            <h3 className="text-sm font-semibold mb-2">Terms & Conditions</h3>
            <textarea
              value={formData.terms}
              onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
              className="w-full h-32 rounded-md border border-border bg-transparent px-3 py-2 text-sm resize-none"
              placeholder="Terms and conditions..."
            />
          </Card>
        </div>

        {/* Summary */}
        <div className="space-y-3">
          <Card className="p-3">
            <h3 className="text-sm font-semibold mb-2">Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Qty</span>
                <span>{totals.totalQty}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(totals.subtotal)}</span>
              </div>
              {totals.totalDiscount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="text-destructive">-{formatCurrency(totals.totalDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Taxable Amount</span>
                <span>{formatCurrency(totals.taxableAmount)}</span>
              </div>
              {intraState ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CGST</span>
                    <span>{formatCurrency(totals.totalCGST)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">SGST</span>
                    <span>{formatCurrency(totals.totalSGST)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IGST</span>
                  <span>{formatCurrency(totals.totalIGST)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax Amount</span>
                <span>{formatCurrency(totals.totalTax)}</span>
              </div>
              {totals.roundOff !== 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Round Off</span>
                  <span>{totals.roundOff > 0 ? '+' : ''}{formatCurrency(totals.roundOff)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Grand Total</span>
                <span>{formatCurrency(totals.grandTotal)}</span>
              </div>
            </div>
          </Card>

          <Card className="p-3">
            <p className="text-xs text-muted-foreground">
              <strong>Amount in Words:</strong><br />
              {amountInWords(totals.grandTotal)}
            </p>
          </Card>

          <Card className="p-3">
            <div className="flex justify-between text-sm">
              <div>
                <p className="font-medium">For {company.name}</p>
                <br />
                <br />
                <p className="text-muted-foreground">Authorized Signatory</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground text-center">
              This is a computer generated Purchase Order and does not require a signature.
            </p>
          </Card>
        </div>
      </div>

      {/* Supplier Search Dialog */}
      <Dialog open={showSupplierSearch} onOpenChange={setShowSupplierSearch}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Supplier</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Search suppliers..."
              value={supplierSearch}
              onChange={(e) => setSupplierSearch(e.target.value)}
              autoFocus
            />
            <div className="max-h-64 overflow-y-auto space-y-1">
              {filteredSuppliers.map((supplier) => (
                <button
                  key={supplier.id}
                  className="w-full text-left p-3 rounded-md hover:bg-muted text-sm"
                  onClick={() => selectSupplier(supplier)}
                >
                  <p className="font-medium">{supplier.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {supplier.code && `Code: ${supplier.code} | `}
                    GSTIN: {supplier.gstin || 'N/A'}
                  </p>
                </button>
              ))}
              {filteredSuppliers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No suppliers found</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Supplier Dialog */}
      <Dialog open={showNewSupplier} onOpenChange={setShowNewSupplier}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Supplier</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-sm font-medium">Name *</label>
              <Input
                value={newSupplier.name}
                onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Code</label>
              <Input
                value={newSupplier.code}
                onChange={(e) => setNewSupplier({ ...newSupplier, code: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">GSTIN</label>
              <Input
                value={newSupplier.gstin}
                onChange={(e) => setNewSupplier({ ...newSupplier, gstin: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Contact Person</label>
              <Input
                value={newSupplier.contact_person}
                onChange={(e) => setNewSupplier({ ...newSupplier, contact_person: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Phone</label>
              <Input
                value={newSupplier.phone}
                onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">City</label>
              <Input
                value={newSupplier.billing_address.city}
                onChange={(e) =>
                  setNewSupplier({
                    ...newSupplier,
                    billing_address: { ...newSupplier.billing_address, city: e.target.value },
                  })
                }
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">State</label>
              <Input
                value={newSupplier.billing_address.state}
                onChange={(e) =>
                  setNewSupplier({
                    ...newSupplier,
                    billing_address: { ...newSupplier.billing_address, state: e.target.value },
                  })
                }
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewSupplier(false)}>Cancel</Button>
            <Button onClick={handleCreateSupplier}>Create Supplier</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
