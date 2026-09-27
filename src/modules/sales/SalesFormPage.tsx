import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus,
  Trash2,
  Copy,
  Save,
  Printer,
  FileText,
  ArrowLeft,
  UserPlus,
  Search,
  GripVertical,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import {
  cn,
  formatCurrency,
  formatDate,
  amountInWords,
  generateDocumentNumber,
  getCurrentFinancialYear,
  isSameState,
  getStateCode,
} from '@/lib/utils';
import { useCompanyView } from '@/contexts/CompanyContext';
import { usePermissions } from '@/contexts/PermissionContext';
import {
  getTransaction,
  createTransaction,
  updateTransaction,
  getNextDocumentNumber,
} from '@/services/transaction.service';
import { getCustomers, createCustomer } from '@/services/customer.service';
import { getProducts } from '@/services/product.service';
import { DEFAULT_TERMS_AND_CONDITIONS } from '@/config/transaction.config';
import type { TransactionItemFormData } from '@/types/transaction.types';
import type { CustomerWithRelations } from '@/types/customer.types';
import type { ProductWithRelations } from '@/types/product.types';
import type { Address } from '@/types/database.types';
import type { AddressFormData } from '@/types/customer.types';
import { toAddressFormData } from '@/lib/address';

interface InvoiceItem extends TransactionItemFormData {
  _key: string;
  _productSearch?: string;
  _showProductDropdown?: boolean;
}

function generateKey(): string {
  return Math.random().toString(36).substring(2, 10);
}

function createEmptyItem(sortOrder: number): InvoiceItem {
  return {
    _key: generateKey(),
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
    sort_order: sortOrder,
  };
}

function calculateItemTotals(item: InvoiceItem, isInterstate: boolean) {
  const gross = item.quantity * item.rate;
  const discountValue = item.discount_percent > 0
    ? (gross * item.discount_percent) / 100
    : item.discount_amount;
  const taxableValue = gross - discountValue;

  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (isInterstate) {
    igst = (taxableValue * item.gst_rate) / 100;
  } else {
    cgst = (taxableValue * (item.gst_rate / 2)) / 100;
    sgst = (taxableValue * (item.gst_rate / 2)) / 100;
  }

  const total = taxableValue + cgst + sgst + igst;

  return {
    gross,
    discountValue,
    taxableValue,
    cgst,
    sgst,
    igst,
    total,
  };
}

export default function SalesFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const company = useCompanyView();
  const { canCreate, canEdit } = usePermissions();
  const { toast } = useToast();
  const productSearchRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  const isEdit = Boolean(id);

  const [documentNumber, setDocumentNumber] = useState('');
  const [documentDate, setDocumentDate] = useState(new Date().toISOString().split('T')[0]);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState(false);

  // Customer
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');
  const [customerState, setCustomerState] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [billingAddress, setBillingAddress] = useState<Address | null>(null);
  const [shippingAddress, setShippingAddress] = useState<Address | null>(null);
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customers, setCustomers] = useState<CustomerWithRelations[]>([]);
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [showNewCustomerDialog, setShowNewCustomerDialog] = useState(false);

  // New customer inline form
  const [newCustomer, setNewCustomer] = useState({
    name: '', phone: '', email: '', gstin: '', state: '',
    address: '', city: '', pin: '',
  });

  // Items
  const [items, setItems] = useState<InvoiceItem[]>([createEmptyItem(1)]);
  const [productSearchResults, setProductSearchResults] = useState<Map<string, ProductWithRelations[]>>(new Map());

  // Totals
  const [roundOff, setRoundOff] = useState(0);
  const [paymentType, setPaymentType] = useState<'cash' | 'credit'>('credit');
  const [amountReceived, setAmountReceived] = useState(0);

  // Terms
  const [terms, setTerms] = useState(DEFAULT_TERMS_AND_CONDITIONS.sales_invoice.join('\n'));

  // Product search dropdown state
  const [activeProductKey, setActiveProductKey] = useState<string | null>(null);

  // Calculate inter/intra state
  const isInterstate = useMemo(() => {
    return !isSameState(company.state, customerState);
  }, [company.state, customerState]);

  // Load data
  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await getProducts({}, 1, 500);
        // Cache all products for search
      } catch {
        // ignore
      }
    }
    loadProducts();
  }, []);

  useEffect(() => {
    if (isEdit && id) {
      loadTransaction(id);
    } else {
      generateDocNumber();
    }
  }, [isEdit, id]);

  const generateDocNumber = async () => {
    try {
      const num = await getNextDocumentNumber('sale');
      setDocumentNumber(num);
    } catch {
      const fy = getCurrentFinancialYear();
      setDocumentNumber(`INV/${fy}/0001`);
    }
  };

  const loadTransaction = async (txnId: string) => {
    try {
      setLoading(true);
      const txn = await getTransaction(txnId);
      setDocumentNumber(txn.document_number);
      setDocumentDate(txn.document_date);
      setReferenceNumber(txn.reference_number || '');
      setCustomerId(txn.customer_id);
      setCustomerName(txn.customer?.name || '');
      setCustomerGstin(txn.customer?.gstin || '');
      setCustomerState(txn.customer?.state || '');
      setCustomerPhone(txn.customer?.phone || '');
      setCustomerEmail(txn.customer?.email || '');
      setBillingAddress(txn.billing_address);
      setShippingAddress(txn.shipping_address);
      setRoundOff(txn.round_off);
      setTerms(txn.terms || DEFAULT_TERMS_AND_CONDITIONS.sales_invoice.join('\n'));

      if (txn.items && txn.items.length > 0) {
        setItems(
          txn.items.map((item, idx) => ({
            _key: generateKey(),
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
            sort_order: item.sort_order || idx,
          }))
        );
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load invoice', variant: 'destructive' });
      navigate('/sales');
    } finally {
      setLoading(false);
    }
  };

  // Customer search
  useEffect(() => {
    if (!customerSearchQuery || customerSearchQuery.length < 2) {
      setCustomers([]);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const response = await getCustomers({ search: customerSearchQuery }, 1, 20);
        setCustomers(response.customers);
      } catch {
        // ignore
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [customerSearchQuery]);

  const selectCustomer = (customer: CustomerWithRelations) => {
    setCustomerId(customer.id);
    setCustomerName(customer.name);
    setCustomerGstin(customer.gstin || '');
    setCustomerState(customer.state || '');
    setCustomerPhone(customer.phone || '');
    setCustomerEmail(customer.email || '');
    setBillingAddress(customer.billing_address);
    setShippingAddress(customer.shipping_address);
    setCustomerSearchQuery('');
    setCustomers([]);
    setCustomerDropdownOpen(false);
  };

  const handleCreateCustomer = async () => {
    if (!newCustomer.name) {
      toast({ title: 'Error', description: 'Customer name is required', variant: 'destructive' });
      return;
    }
    try {
      const addr: AddressFormData = toAddressFormData({
        line1: newCustomer.address,
        line2: null,
        city: newCustomer.city,
        state: newCustomer.state,
        pin: newCustomer.pin,
        country: 'India',
      });

      const created = await createCustomer({
        name: newCustomer.name,
        code: '',
        gstin: newCustomer.gstin,
        pan: '',
        contact_person: '',
        phone: newCustomer.phone,
        alt_phone: '',
        email: newCustomer.email,
        billing_address: addr,
        shipping_address: addr,
        same_as_billing: true,
        city: newCustomer.city,
        state: newCustomer.state,
        pin: newCustomer.pin,
        country: 'India',
        credit_limit: 0,
        credit_period: 0,
        opening_balance: 0,
        opening_balance_type: 'debit',
        bank_details: { bank_name: '', account_number: '', ifsc_code: '', branch: '' },
        notes: '',
        is_active: true,
      });

      setCustomerId(created.id);
      setCustomerName(created.name);
      setCustomerGstin(created.gstin || '');
      setCustomerState(created.state || '');
      setCustomerPhone(created.phone || '');
      setCustomerEmail(created.email || '');
      setBillingAddress(created.billing_address);
      setShippingAddress(created.shipping_address);
      setShowNewCustomerDialog(false);
      setNewCustomer({ name: '', phone: '', email: '', gstin: '', state: '', address: '', city: '', pin: '' });
      toast({ title: 'Created', description: 'Customer created successfully', variant: 'success' });
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to create customer', variant: 'destructive' });
    }
  };

  // Product search per item
  const searchProduct = useCallback(async (key: string, query: string) => {
    if (!query || query.length < 2) {
      setProductSearchResults((prev) => {
        const next = new Map(prev);
        next.delete(key);
        return next;
      });
      return;
    }
    try {
      const response = await getProducts({ search: query }, 1, 10);
      setProductSearchResults((prev) => {
        const next = new Map(prev);
        next.set(key, response.products);
        return next;
      });
    } catch {
      // ignore
    }
  }, []);

  const selectProduct = (key: string, product: ProductWithRelations) => {
    setItems((prev) =>
      prev.map((item) =>
        item._key === key
          ? {
              ...item,
              product_id: product.id,
              product_name: product.name,
              product_code: product.code,
              brand_name: product.brand?.name || '',
              rate: product.selling_price,
              gst_rate: product.gst_rate,
              unit: product.unit?.short_name || 'NOS',
              _productSearch: '',
              _showProductDropdown: false,
            }
          : item
      )
    );
    setProductSearchResults((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  };

  const updateItem = (key: string, field: keyof InvoiceItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item._key !== key) return item;
        const updated = { ...item, [field]: value };

        if (field === 'discount_percent' && typeof value === 'number') {
          const gross = updated.quantity * updated.rate;
          updated.discount_amount = (gross * value) / 100;
        }
        if (field === 'rate' || field === 'quantity') {
          const gross = updated.quantity * updated.rate;
          updated.discount_amount = updated.discount_percent > 0
            ? (gross * updated.discount_percent) / 100
            : updated.discount_amount;
        }

        return updated;
      })
    );
  };

  const addItem = () => {
    setItems((prev) => [...prev, createEmptyItem(prev.length + 1)]);
  };

  const removeItem = (key: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((item) => item._key !== key));
  };

  const duplicateItem = (key: string) => {
    const item = items.find((i) => i._key === key);
    if (!item) return;
    const newItem: InvoiceItem = {
      ...item,
      _key: generateKey(),
      id: undefined,
      sort_order: items.length + 1,
    };
    setItems((prev) => {
      const idx = prev.findIndex((i) => i._key === key);
      const next = [...prev];
      next.splice(idx + 1, 0, newItem);
      return next.map((item, i) => ({ ...item, sort_order: i + 1 }));
    });
  };

  // Calculate totals
  const totals = useMemo(() => {
    let totalQty = 0;
    let totalDiscount = 0;
    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    items.forEach((item) => {
      const calc = calculateItemTotals(item, isInterstate);
      totalQty += item.quantity;
      totalDiscount += calc.discountValue;
      totalTaxable += calc.taxableValue;
      totalCgst += calc.cgst;
      totalSgst += calc.sgst;
      totalIgst += calc.igst;
    });

    const totalTax = totalCgst + totalSgst + totalIgst;
    const subtotal = totalTaxable;
    const grandTotalRaw = subtotal + totalTax + roundOff;
    const grandTotal = Math.round(grandTotalRaw);

    return {
      totalQty,
      totalDiscount,
      totalTaxable,
      totalCgst,
      totalSgst,
      totalIgst,
      totalTax,
      subtotal,
      grandTotal,
    };
  }, [items, isInterstate, roundOff]);

  // Calculate round off
  const autoRoundOff = useMemo(() => {
    const raw = items.reduce((sum, item) => {
      const calc = calculateItemTotals(item, isInterstate);
      return sum + calc.taxableValue + calc.cgst + calc.sgst + calc.igst;
    }, 0);
    return Math.round(raw) - raw;
  }, [items, isInterstate]);

  useEffect(() => {
    setRoundOff(Math.round(autoRoundOff * 100) / 100);
  }, [autoRoundOff]);

  // Save
  const handleSave = async (action: 'draft' | 'print' | 'new') => {
    if (!customerId) {
      toast({ title: 'Error', description: 'Please select a customer', variant: 'destructive' });
      return;
    }
    if (items.length === 0 || items.every((i) => !i.product_name)) {
      toast({ title: 'Error', description: 'Please add at least one item', variant: 'destructive' });
      return;
    }

    try {
      setSaving(true);
      const formData = {
        type: 'sale' as const,
        document_number: documentNumber,
        document_date: documentDate,
        reference_number: referenceNumber,
        customer_id: customerId,
        supplier_id: null,
        billing_address: billingAddress,
        shipping_address: sameAsBilling ? billingAddress : shippingAddress,
        items: items
          .filter((i) => i.product_name)
          .map((item, idx) => ({
            ...item,
            sort_order: idx + 1,
          })),
        discount_amount: totals.totalDiscount,
        round_off: roundOff,
        notes: '',
        terms,
        status: 'draft' as const,
      };

      if (isEdit && id) {
        await updateTransaction(id, formData);
        toast({ title: 'Updated', description: 'Sales invoice updated successfully', variant: 'success' });
      } else {
        await createTransaction(formData);
        toast({ title: 'Created', description: 'Sales invoice created successfully', variant: 'success' });
      }

      if (action === 'print') {
        navigate('/sales');
      } else if (action === 'new') {
        navigate('/sales/new');
      } else {
        navigate('/sales');
      }
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <PageHeader
        title={isEdit ? 'Edit Sales Invoice' : 'New Sales Invoice'}
        description={isEdit ? `Editing ${documentNumber}` : 'Create a new sales invoice'}
        breadcrumbs={[
          { label: 'Dashboard', onClick: () => navigate('/') },
          { label: 'Sales Invoices', onClick: () => navigate('/sales') },
          { label: isEdit ? 'Edit' : 'New Invoice' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/sales')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button variant="outline" onClick={() => handleSave('draft')} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
            <Button onClick={() => handleSave('print')} disabled={saving}>
              <Printer className="h-4 w-4 mr-2" />
              Save & Print
            </Button>
          </div>
        }
      />

      <div className="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main Column */}
        <div className="xl:col-span-2 space-y-6">
          {/* Header Section */}
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Document No.</label>
                  <Input
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Document Date</label>
                  <Input
                    type="date"
                    value={documentDate}
                    onChange={(e) => setDocumentDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Reference No.</label>
                  <Input
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="Optional"
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Consignor & Consignee */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Consignor */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Consignor (Seller)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1 text-sm">
                  <p className="font-semibold">{company.name}</p>
                  {company.address && <p className="text-muted-foreground">{company.address}</p>}
                  {company.city && company.state && (
                    <p className="text-muted-foreground">{company.city}, {company.state} {company.pincode}</p>
                  )}
                  {company.gstin && <p className="text-muted-foreground">GSTIN: {company.gstin}</p>}
                  {company.phone && <p className="text-muted-foreground">Phone: {company.phone}</p>}
                  {company.email && <p className="text-muted-foreground">Email: {company.email}</p>}
                </div>
              </CardContent>
            </Card>

            {/* Consignee */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Consignee (Buyer)
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNewCustomerDialog(true)}
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    New
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="relative">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                      value={customerSearchQuery || customerName}
                      onChange={(e) => {
                        setCustomerSearchQuery(e.target.value);
                        setCustomerDropdownOpen(true);
                        if (!e.target.value) {
                          setCustomerId(null);
                          setCustomerName('');
                          setCustomerGstin('');
                          setCustomerState('');
                          setBillingAddress(null);
                        }
                      }}
                      onFocus={() => setCustomerDropdownOpen(true)}
                      placeholder="Search customer..."
                      className="flex-1"
                    />
                  </div>
                  {customerDropdownOpen && customers.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full rounded-md border bg-card shadow-lg max-h-60 overflow-auto">
                      {customers.map((c) => (
                        <button
                          key={c.id}
                          className="w-full px-3 py-2 text-left hover:bg-muted text-sm"
                          onClick={() => { selectCustomer(c); setCustomerDropdownOpen(false); }}
                        >
                          <span className="font-medium">{c.name}</span>
                          {c.gstin && <span className="ml-2 text-muted-foreground">({c.gstin})</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {customerId && (
                  <div className="mt-3 space-y-1 text-sm border rounded-md p-3 bg-muted/30">
                    <p className="font-semibold">{customerName}</p>
                    {billingAddress && (
                      <p className="text-muted-foreground">
                        {billingAddress.line1}{billingAddress.line2 ? `, ${billingAddress.line2}` : ''}
                        <br />
                        {billingAddress.city}, {billingAddress.state} {billingAddress.pin}
                      </p>
                    )}
                    {customerGstin && <p className="text-muted-foreground">GSTIN: {customerGstin}</p>}
                    {customerPhone && <p className="text-muted-foreground">Phone: {customerPhone}</p>}
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="checkbox"
                        checked={sameAsBilling}
                        onChange={(e) => setSameAsBilling(e.target.checked)}
                        className="rounded"
                        id="sameAsBilling"
                      />
                      <label htmlFor="sameAsBilling" className="text-xs text-muted-foreground">
                        Shipping address same as billing
                      </label>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Item Grid */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Items</CardTitle>
                <Button size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-2 w-8">#</th>
                      <th className="pb-2 pr-2 min-w-[140px]">Item Name</th>
                      <th className="pb-2 pr-2 w-16">Qty</th>
                      <th className="pb-2 pr-2 w-16">Unit</th>
                      <th className="pb-2 pr-2 w-24 text-right">Rate</th>
                      <th className="pb-2 pr-2 w-16 text-right">Disc%</th>
                      <th className="pb-2 pr-2 w-24 text-right">Taxable</th>
                      <th className="pb-2 pr-2 w-16 text-right">GST%</th>
                      <th className="pb-2 pr-2 w-20 text-right">{isInterstate ? 'IGST' : 'CGST'}</th>
                      {!isInterstate && <th className="pb-2 pr-2 w-20 text-right">SGST</th>}
                      <th className="pb-2 pr-2 w-24 text-right">Total</th>
                      <th className="pb-2 w-20 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => {
                      const calc = calculateItemTotals(item, isInterstate);
                      return (
                        <tr key={item._key} className="border-b last:border-0">
                          <td className="py-2 pr-2 text-muted-foreground">{idx + 1}</td>
                          <td className="py-2 pr-2">
                            <div className="relative">
                              <Input
                                value={item._productSearch !== undefined ? item._productSearch : item.product_name}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  updateItem(item._key, '_productSearch', val);
                                  searchProduct(item._key, val);
                                  setActiveProductKey(item._key);
                                }}
                                onFocus={() => setActiveProductKey(item._key)}
                                placeholder="Search product..."
                                className="h-8 text-xs"
                              />
                              {activeProductKey === item._key && productSearchResults.get(item._key) && productSearchResults.get(item._key)!.length > 0 && (
                                <div className="absolute z-50 mt-1 w-full rounded-md border bg-card shadow-lg max-h-48 overflow-auto">
                                  {productSearchResults.get(item._key)!.map((p) => (
                                    <button
                                      key={p.id}
                                      className="w-full px-3 py-2 text-left hover:bg-muted text-xs"
                                      onClick={() => selectProduct(item._key, p)}
                                    >
                                      <span className="font-medium">{p.name}</span>
                                      <span className="ml-2 text-muted-foreground">({p.code})</span>
                                      <span className="ml-2 text-muted-foreground">₹{p.selling_price}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            {item.product_code && (
                              <span className="text-[10px] text-muted-foreground">Code: {item.product_code}</span>
                            )}
                          </td>
                          <td className="py-2 pr-2">
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItem(item._key, 'quantity', parseFloat(e.target.value) || 0)}
                              className="h-8 text-xs text-right"
                              min="0"
                              step="1"
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <Input
                              value={item.unit}
                              onChange={(e) => updateItem(item._key, 'unit', e.target.value)}
                              className="h-8 text-xs"
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <Input
                              type="number"
                              value={item.rate}
                              onChange={(e) => updateItem(item._key, 'rate', parseFloat(e.target.value) || 0)}
                              className="h-8 text-xs text-right"
                              min="0"
                              step="0.01"
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <Input
                              type="number"
                              value={item.discount_percent}
                              onChange={(e) => updateItem(item._key, 'discount_percent', parseFloat(e.target.value) || 0)}
                              className="h-8 text-xs text-right"
                              min="0"
                              max="100"
                              step="0.01"
                            />
                          </td>
                          <td className="py-2 pr-2 text-right text-xs font-medium">
                            {formatCurrency(calc.taxableValue)}
                          </td>
                          <td className="py-2 pr-2">
                            <Select
                              value={String(item.gst_rate)}
                              onValueChange={(v) => updateItem(item._key, 'gst_rate', parseFloat(v))}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {[0, 0.25, 3, 5, 12, 18, 28].map((rate) => (
                                  <SelectItem key={rate} value={String(rate)}>{rate}%</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="py-2 pr-2 text-right text-xs">
                            {isInterstate
                              ? formatCurrency(calc.igst)
                              : formatCurrency(calc.cgst)}
                          </td>
                          {!isInterstate && (
                            <td className="py-2 pr-2 text-right text-xs">
                              {formatCurrency(calc.sgst)}
                            </td>
                          )}
                          <td className="py-2 pr-2 text-right text-xs font-semibold">
                            {formatCurrency(calc.total)}
                          </td>
                          <td className="py-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => duplicateItem(item._key)}
                                title="Duplicate"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => removeItem(item._key)}
                                disabled={items.length <= 1}
                                title="Remove"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Button variant="outline" size="sm" className="mt-3" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" />
                Add Row
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Totals */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Quantity</span>
                <span className="font-medium">{totals.totalQty}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Discount</span>
                <span className="font-medium">{formatCurrency(totals.totalDiscount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Taxable Value</span>
                <span className="font-medium">{formatCurrency(totals.totalTaxable)}</span>
              </div>
              <Separator />
              {isInterstate ? (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">IGST</span>
                  <span className="font-medium">{formatCurrency(totals.totalIgst)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">CGST</span>
                    <span className="font-medium">{formatCurrency(totals.totalCgst)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">SGST</span>
                    <span className="font-medium">{formatCurrency(totals.totalSgst)}</span>
                  </div>
                </>
              )}
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Round Off</span>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={roundOff}
                    onChange={(e) => setRoundOff(parseFloat(e.target.value) || 0)}
                    className="h-8 w-20 text-xs text-right"
                    step="0.01"
                  />
                </div>
              </div>
              <Separator />
              <div className="flex justify-between text-base font-bold">
                <span>Grand Total</span>
                <span className="text-primary">{formatCurrency(totals.grandTotal)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Amount in Words */}
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium mb-1">Amount in Words</p>
              <p className="text-sm font-semibold text-foreground leading-relaxed">
                {amountInWords(totals.grandTotal)}
              </p>
            </CardContent>
          </Card>

          {/* Payment */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="flex gap-2">
                <Button
                  variant={paymentType === 'cash' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setPaymentType('cash')}
                >
                  Cash
                </Button>
                <Button
                  variant={paymentType === 'credit' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setPaymentType('credit')}
                >
                  Credit
                </Button>
              </div>
              {paymentType === 'cash' && (
                <div>
                  <label className="text-sm text-muted-foreground">Amount Received</label>
                  <Input
                    type="number"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(parseFloat(e.target.value) || 0)}
                    className="mt-1"
                    min="0"
                  />
                </div>
              )}
              {paymentType === 'credit' && (
                <div className="text-sm text-muted-foreground">
                  Outstanding: <span className="font-semibold text-destructive">{formatCurrency(totals.grandTotal)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Terms & Conditions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Terms & Conditions
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <textarea
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                rows={5}
                className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              />
            </CardContent>
          </Card>

          {/* Bank Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Bank Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-sm space-y-1">
              <p className="text-muted-foreground">Bank Name: <span className="text-foreground">-</span></p>
              <p className="text-muted-foreground">A/C Name: <span className="text-foreground">{company.name}</span></p>
              <p className="text-muted-foreground">A/C No: <span className="text-foreground">-</span></p>
              <p className="text-muted-foreground">IFSC: <span className="text-foreground">-</span></p>
              <p className="text-muted-foreground">Branch: <span className="text-foreground">-</span></p>
            </CardContent>
          </Card>

          {/* Signature */}
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-end">
                <div className="text-center">
                  <div className="w-32 border-b border-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground">Receiver's Signature</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">For {company.name}</p>
                  <div className="w-32 border-b border-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground">Authorized Signatory</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <p className="text-xs text-center text-muted-foreground italic">
            This is a computer generated Sales Invoice and does not require a signature.
          </p>
        </div>
      </div>

      {/* New Customer Dialog */}
      <Dialog open={showNewCustomerDialog} onOpenChange={setShowNewCustomerDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Name *</label>
              <Input
                value={newCustomer.name}
                onChange={(e) => setNewCustomer((p) => ({ ...p, name: e.target.value }))}
                className="mt-1"
                placeholder="Customer name"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Phone</label>
                <Input
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer((p) => ({ ...p, phone: e.target.value }))}
                  className="mt-1"
                  placeholder="Phone number"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer((p) => ({ ...p, email: e.target.value }))}
                  className="mt-1"
                  placeholder="Email"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">GSTIN</label>
              <Input
                value={newCustomer.gstin}
                onChange={(e) => setNewCustomer((p) => ({ ...p, gstin: e.target.value }))}
                className="mt-1"
                placeholder="GSTIN"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">State</label>
                <Input
                  value={newCustomer.state}
                  onChange={(e) => setNewCustomer((p) => ({ ...p, state: e.target.value }))}
                  className="mt-1"
                  placeholder="State"
                />
              </div>
              <div>
                <label className="text-sm font-medium">City</label>
                <Input
                  value={newCustomer.city}
                  onChange={(e) => setNewCustomer((p) => ({ ...p, city: e.target.value }))}
                  className="mt-1"
                  placeholder="City"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Address</label>
              <Input
                value={newCustomer.address}
                onChange={(e) => setNewCustomer((p) => ({ ...p, address: e.target.value }))}
                className="mt-1"
                placeholder="Address"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCustomerDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateCustomer}>Create Customer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
