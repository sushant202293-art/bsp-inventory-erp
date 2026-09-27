import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyView } from '@/contexts/CompanyContext';
import { transactionService } from '@/services/transaction.service';
import { productService } from '@/services/product.service';
import { customerService } from '@/services/customer.service';
import { documentService } from '@/services/document.service';
import type { Address } from '@/types/database.types';
import { formatCurrency, amountInWords } from '@/lib/utils';
import { addressToMultiline, EMPTY_ADDRESS, isAddressEmpty, toAddress } from '@/lib/address';
import { Plus, Trash2, Copy, Save, Printer } from 'lucide-react';

interface ItemRow {
  product_id: string; product_name: string; product_code: string; brand_name: string;
  quantity: number; unit: string; rate: number; discount_percent: number; discount_amount: number;
  taxable_value: number; gst_rate: number; cgst_amount: number; sgst_amount: number; igst_amount: number;
  total_amount: number;
}

const emptyItem: ItemRow = {
  product_id: '', product_name: '', product_code: '', brand_name: '',
  quantity: 1, unit: 'Pcs', rate: 0, discount_percent: 0, discount_amount: 0,
  taxable_value: 0, gst_rate: 18, cgst_amount: 0, sgst_amount: 0, igst_amount: 0, total_amount: 0,
};

export default function QuotationFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { profile } = useAuth();
  const company = useCompanyView();
  const [loading, setLoading] = useState(false);
  const [docNumber, setDocNumber] = useState('');
  const [docDate, setDocDate] = useState(new Date().toISOString().split('T')[0]);
  const [validityDate, setValidityDate] = useState('');
  const [salesperson, setSalesperson] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [billingAddress, setBillingAddress] = useState<Address>({ ...EMPTY_ADDRESS });
  const [shippingAddress, setShippingAddress] = useState<Address>({ ...EMPTY_ADDRESS });
  const [gstin, setGstin] = useState('');
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [items, setItems] = useState<ItemRow[]>([{ ...emptyItem }]);
  const [terms, setTerms] = useState('1. This quotation is valid for 15 days.\n2. Prices are inclusive of applicable taxes.\n3. Delivery within 7-10 working days.');
  const [notes, setNotes] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<any[]>([]);
  const [productSearchIdx, setProductSearchIdx] = useState<number | null>(null);
  const [productResults, setProductResults] = useState<any[]>([]);

  useEffect(() => {
    if (!id) {
      transactionService.getNextDocumentNumber('quotation').then(setDocNumber).catch(() => setDocNumber('QT-2026-00001'));
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      transactionService.getTransaction(id).then((data: any) => {
        if (data) {
          setDocNumber(data.document_number);
          setDocDate(data.document_date);
          setCustomerId(data.customer_id || '');
          setCustomerName(data.customer?.name || '');
          setBillingAddress(toAddress(data.billing_address));
          setShippingAddress(toAddress(data.shipping_address));
          setGstin(data.customer?.gstin || '');
          setNotes(data.notes || '');
          setTerms(data.terms || '');
          if (data.items?.length) setItems(data.items);
        }
      });
    }
  }, [id]);

  async function searchCustomers(q: string) {
    setCustomerSearch(q);
    if (q.length < 2) { setCustomerResults([]); return; }
    try {
      const data = await customerService.getCustomers({ search: q }, 1, 8);
      setCustomerResults(data?.customers || []);
    } catch (e) { console.error(e); }
  }

  function selectCustomer(c: any) {
    const billing = toAddress(c.billing_address);
    if (!billing.city) billing.city = c.city || '';
    if (!billing.state) billing.state = c.state || '';
    if (!billing.pin) billing.pin = c.pin || '';

    setCustomerId(c.id);
    setCustomerName(c.name);
    setBillingAddress(billing);
    setGstin(c.gstin || '');
    setCustomerSearch('');
    setCustomerResults([]);
    if (sameAsBilling) setShippingAddress({ ...billing });
  }

  async function searchProducts(q: string, idx: number) {
    setProductSearchIdx(idx);
    if (q.length < 2) { setProductResults([]); return; }
    try {
      const data = await productService.getProducts({ search: q }, 1, 8);
      setProductResults(data?.products || []);
    } catch (e) { console.error(e); }
  }

  function selectProduct(p: any, idx: number) {
    const newItems = [...items];
    newItems[idx] = { ...newItems[idx], product_id: p.id, product_name: p.name, product_code: p.code, brand_name: p.brand || '', rate: p.selling_price || 0, gst_rate: p.gst_rate || 18, unit: p.unit || 'Pcs' };
    recalcRow(newItems, idx);
    setItems(newItems);
    setProductResults([]); setProductSearchIdx(null);
  }

  function recalcRow(rows: ItemRow[], idx: number) {
    const r = rows[idx];
    const gross = r.quantity * r.rate;
    r.discount_amount = gross * (r.discount_percent / 100);
    r.taxable_value = gross - r.discount_amount;
    r.cgst_amount = r.taxable_value * (r.gst_rate / 200);
    r.sgst_amount = r.taxable_value * (r.gst_rate / 200);
    r.igst_amount = 0;
    r.total_amount = r.taxable_value + r.cgst_amount + r.sgst_amount;
  }

  function updateItem(idx: number, field: keyof ItemRow, value: any) {
    const newItems = [...items];
    (newItems[idx] as any)[field] = value;
    recalcRow(newItems, idx);
    setItems(newItems);
  }

  function addItem() { setItems([...items, { ...emptyItem }]); }
  function removeItem(idx: number) { if (items.length > 1) setItems(items.filter((_, i) => i !== idx)); }
  function duplicateItem(idx: number) { setItems([...items, { ...items[idx] }]); }

  const totals = items.reduce((acc, r) => ({
    qty: acc.qty + r.quantity, discount: acc.discount + r.discount_amount,
    taxable: acc.taxable + r.taxable_value, cgst: acc.cgst + r.cgst_amount,
    sgst: acc.sgst + r.sgst_amount, total: acc.total + r.total_amount,
  }), { qty: 0, discount: 0, taxable: 0, cgst: 0, sgst: 0, total: 0 });

  const grandTotal = Math.round(totals.total);

  async function handleSave(status: 'draft' | 'approved') {
    if (!customerId) {
      toast({ title: 'Customer required', description: 'Select a customer before saving.', variant: 'destructive' });
      return;
    }
    if (items.filter((i) => i.product_id).length === 0) {
      toast({ title: 'Items required', description: 'Add at least one product to the quotation.', variant: 'destructive' });
      return;
    }
    if (isAddressEmpty(billingAddress)) {
      toast({ title: 'Billing address required', description: 'Select a customer with a billing address.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const data = {
        type: 'quotation' as const, document_number: docNumber, document_date: docDate,
        customer_id: customerId, billing_address: billingAddress,
        shipping_address: sameAsBilling ? billingAddress : shippingAddress,
        gstin, items: items.filter(i => i.product_id), subtotal: totals.taxable,
        discount_amount: totals.discount, tax_amount: totals.cgst + totals.sgst,
        grand_total: grandTotal, status, notes, terms, validity_date: validityDate,
        salesperson,
      };
      if (id) { await transactionService.updateTransaction(id, data); }
      else { await transactionService.createTransaction(data); }
      toast({ title: 'Saved', description: `Quotation ${status === 'draft' ? 'saved as draft' : 'created'}` });
      navigate('/quotations');
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to save', variant: 'destructive' });
    } finally { setLoading(false); }
  }

  async function handlePrint() {
    setLoading(true);
    try {
      const savedId = id ?? (await transactionService.createTransaction({
        type: 'quotation',
        document_number: docNumber,
        document_date: docDate,
        customer_id: customerId,
        billing_address: billingAddress,
        shipping_address: sameAsBilling ? billingAddress : shippingAddress,
        items: items.filter((i) => i.product_id),
        discount_amount: totals.discount,
        status: 'approved',
        notes,
        terms,
        validity_date: validityDate,
        salesperson,
      })).id;

      if (savedId) {
        await documentService.printQuotation(savedId);
        navigate(`/quotations/${savedId}?print=true`);
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to print', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{id ? 'Edit' : 'New'} Quotation</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handlePrint()} disabled={loading}><Printer className="mr-2 h-4 w-4" /> Print</Button>
          <Button variant="outline" onClick={() => handleSave('draft')} disabled={loading}><Save className="mr-2 h-4 w-4" /> Save Draft</Button>
          <Button onClick={() => handleSave('approved')} disabled={loading}>Approve &amp; Save</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Document Number</Label>
              <Input value={docNumber} onChange={(e) => setDocNumber(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={docDate} onChange={(e) => setDocDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Validity Date</Label>
              <Input type="date" value={validityDate} onChange={(e) => setValidityDate(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Company (Consignor)</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-semibold">{company?.name || 'Company Name'}</p>
            <p className="text-muted-foreground">{company?.address || ''}</p>
            <p className="text-muted-foreground">{company?.city}, {company?.state} - {company?.pincode}</p>
            {company?.gstin && <p className="text-muted-foreground">GSTIN: {company.gstin}</p>}
            <p className="text-muted-foreground">{company?.phone} | {company?.email}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Customer (Consignee)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Input placeholder="Search customer..." value={customerSearch} onChange={(e) => searchCustomers(e.target.value)} />
              {customerResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border bg-popover p-1 shadow-md max-h-48 overflow-y-auto">
                  {customerResults.map((c) => (
                    <button key={c.id} className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent" onClick={() => selectCustomer(c)}>
                      {c.name} {c.gstin && `(${c.gstin})`}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {customerName && <div className="text-sm"><p className="font-semibold">{customerName}</p><p className="text-muted-foreground whitespace-pre-line">{addressToMultiline(billingAddress)}</p></div>}
            <div className="flex items-center gap-2"><input type="checkbox" checked={sameAsBilling} onChange={(e) => { setSameAsBilling(e.target.checked); if (e.target.checked) setShippingAddress({ ...billingAddress }); }} id="sameAddr" /><label htmlFor="sameAddr" className="text-sm">Same as Billing Address</label></div>
            {!sameAsBilling && (
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Address line 1" value={shippingAddress.line1} onChange={(e) => setShippingAddress({ ...shippingAddress, line1: e.target.value })} className="col-span-2" />
                <Input placeholder="City" value={shippingAddress.city} onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })} />
                <Input placeholder="State" value={shippingAddress.state} onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })} />
                <Input placeholder="PIN" value={shippingAddress.pin} onChange={(e) => setShippingAddress({ ...shippingAddress, pin: e.target.value })} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Items</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-2">#</th><th className="p-2">Item Name</th><th className="p-2">Qty</th><th className="p-2">Rate</th><th className="p-2">Disc %</th><th className="p-2">Taxable</th><th className="p-2">GST</th><th className="p-2">Total</th><th className="p-2 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="p-2">{idx + 1}</td>
                    <td className="p-2">
                      <div className="relative">
                        <Input value={item.product_name} onChange={(e) => { updateItem(idx, 'product_name', e.target.value); searchProducts(e.target.value, idx); }} placeholder="Search product..." className="w-48" />
                        {productSearchIdx === idx && productResults.length > 0 && (
                          <div className="absolute z-10 mt-1 w-full rounded-lg border bg-popover p-1 shadow-md max-h-40 overflow-y-auto">
                            {productResults.map((p) => (
                              <button key={p.id} className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent" onClick={() => selectProduct(p, idx)}>
                                {p.name} ({p.code})
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-2"><Input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))} className="w-20" /></td>
                    <td className="p-2"><Input type="number" value={item.rate} onChange={(e) => updateItem(idx, 'rate', Number(e.target.value))} className="w-24" /></td>
                    <td className="p-2"><Input type="number" value={item.discount_percent} onChange={(e) => updateItem(idx, 'discount_percent', Number(e.target.value))} className="w-16" /></td>
                    <td className="p-2 text-right">{formatCurrency(item.taxable_value)}</td>
                    <td className="p-2 text-right">{item.gst_rate}%</td>
                    <td className="p-2 text-right font-semibold">{formatCurrency(item.total_amount)}</td>
                    <td className="p-2">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => duplicateItem(idx)}><Copy className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => removeItem(idx)}><Trash2 className="h-3 w-3 text-red-500" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button variant="outline" size="sm" className="mt-3" onClick={addItem}><Plus className="mr-1 h-3 w-3" /> Add Item</Button>

          <Separator className="my-4" />

          <div className="flex justify-end">
            <div className="w-72 space-y-1 text-sm">
              <div className="flex justify-between"><span>Total Qty</span><span>{totals.qty}</span></div>
              <div className="flex justify-between"><span>Discount</span><span>- {formatCurrency(totals.discount)}</span></div>
              <div className="flex justify-between"><span>Taxable</span><span>{formatCurrency(totals.taxable)}</span></div>
              <div className="flex justify-between"><span>CGST</span><span>{formatCurrency(totals.cgst)}</span></div>
              <div className="flex justify-between"><span>SGST</span><span>{formatCurrency(totals.sgst)}</span></div>
              <Separator />
              <div className="flex justify-between text-lg font-bold"><span>Grand Total</span><span>{formatCurrency(grandTotal)}</span></div>
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-muted/50 p-3 text-sm">
            <strong>Amount in Words:</strong> {amountInWords(grandTotal)}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Terms &amp; Notes</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Salesperson" value={salesperson} onChange={(e) => setSalesperson(e.target.value)} />
            <Textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={4} placeholder="Terms &amp; conditions" />
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Notes" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Bank Details</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-semibold">{company?.name}</p>
            <p className="text-muted-foreground">Bank: {company?.bank_name || 'HDFC Bank'}</p>
            <p className="text-muted-foreground">A/C: {company?.bank_account || '50100012345678'}</p>
            <p className="text-muted-foreground">IFSC: {company?.bank_ifsc || 'HDFC0001234'}</p>
            <p className="text-muted-foreground">UPI: {company?.bank_upi || `${company?.name?.replace(/\s/g, '')}@upi`}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between border-t pt-6">
        <div className="text-sm text-muted-foreground">Receiver's Signature</div>
        <div className="text-right text-sm">
          <p className="font-semibold">For {company?.name || 'Company'}</p>
          <p className="mt-8 text-muted-foreground">Authorized Signatory</p>
        </div>
      </div>
      <p className="text-center text-xs text-muted-foreground">This is a computer generated Quotation and does not require a signature.</p>
    </div>
  );
}
