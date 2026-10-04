import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Save, X, Loader2, Sparkles, Plus, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { getProduct, createProduct, updateProduct } from '@/services/product.service';
import { supabase } from '@/lib/supabase';
import { generateId, formatCurrency } from '@/lib/utils';
import type { ProductFormData } from '@/types/product.types';

const productFormSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters').max(200),
  code: z.string().min(1, 'Product code is required').max(50),
  category_id: z.string().optional().nullable(),
  brand_id: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  size: z.string().optional().nullable(),
  unit_id: z.string().optional().nullable(),
  gst_rate: z.number().min(0).max(100).default(18),
  hsn_sac: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  purchase_price: z.number().min(0, 'Purchase price cannot be negative'),
  selling_price: z.number().min(0, 'Selling price cannot be negative'),
  low_stock_level: z.number().min(0).default(10),
  reorder_level: z.number().min(0).default(5),
  image_url: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
});

type FormData = z.input<typeof productFormSchema>;

interface Category { id: string; name: string; }
interface Brand { id: string; name: string; }
interface Unit { id: string; name: string; short_name: string; }

type QuickCreateKind = 'category' | 'brand' | 'unit' | null;

export default function ProductFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditing);
  const [showAdditional, setShowAdditional] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);

  const [quickCreate, setQuickCreate] = useState<QuickCreateKind>(null);
  const [quickName, setQuickName] = useState('');
  const [quickShortName, setQuickShortName] = useState('');
  const [quickSaving, setQuickSaving] = useState(false);

  const {
    register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: '', code: '', category_id: null, brand_id: null, color: '', size: '',
      unit_id: null, gst_rate: 18, hsn_sac: '', description: '', purchase_price: 0,
      selling_price: 0, low_stock_level: 10, reorder_level: 5, image_url: '',
      barcode: '', is_active: true,
    },
  });

  const purchasePrice = watch('purchase_price') ?? 0;
  const sellingPrice = watch('selling_price') ?? 0;
  const gstRate = watch('gst_rate') ?? 0;
  const imageUrl = watch('image_url');

  const marginPercent =
    purchasePrice > 0 ? ((sellingPrice - purchasePrice) / purchasePrice) * 100 : 0;
  const gstAmount = (sellingPrice * gstRate) / 100;
  const priceWithTax = sellingPrice + gstAmount;

  const loadDropdowns = useCallback(async () => {
    try {
      const [catsRes, brsRes, unitsRes] = await Promise.all([
        supabase.from('categories').select('id, name').eq('is_active', true).order('name'),
        supabase.from('brands').select('id, name').eq('is_active', true).order('name'),
        supabase.from('units').select('id, name, short_name').eq('is_active', true).order('name'),
      ]);
      setCategories(catsRes.data || []);
      setBrands(brsRes.data || []);
      setUnits(unitsRes.data || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { loadDropdowns(); }, [loadDropdowns]);

  useEffect(() => {
    if (!isEditing || !id) return;
    const loadProduct = async () => {
      setInitialLoading(true);
      try {
        const product = await getProduct(id);
        reset({
          name: product.name,
          code: product.code,
          category_id: product.category_id,
          brand_id: product.brand_id,
          color: product.color || '',
          size: product.size || '',
          unit_id: product.unit_id,
          gst_rate: product.gst_rate,
          hsn_sac: product.hsn_sac || '',
          description: product.description || '',
          purchase_price: product.purchase_price,
          selling_price: product.selling_price,
          low_stock_level: product.low_stock_level,
          reorder_level: product.reorder_level,
          image_url: product.image_url || '',
          barcode: product.barcode || '',
          is_active: product.is_active,
        });
        if (product.description || product.color || product.size || product.image_url) {
          setShowAdditional(true);
        }
      } catch {
        toast({ title: 'Error', description: 'Failed to load product.', variant: 'destructive' });
        navigate('/products');
      } finally {
        setInitialLoading(false);
      }
    };
    loadProduct();
  }, [isEditing, id, reset, toast, navigate]);

  const generateCode = () => {
    const code = `PRD-${generateId().substring(0, 6).toUpperCase()}`;
    setValue('code', code, { shouldValidate: true });
  };

  const handleClose = () => {
    navigate('/products');
  };

  const openQuickCreate = (kind: Exclude<QuickCreateKind, null>) => {
    setQuickCreate(kind);
    setQuickName('');
    setQuickShortName('');
  };

  const handleQuickCreate = async () => {
    if (!quickCreate) return;
    const name = quickName.trim();
    if (!name) {
      toast({ title: 'Validation error', description: 'Name is required.', variant: 'warning' });
      return;
    }
    if (quickCreate === 'unit' && !quickShortName.trim()) {
      toast({ title: 'Validation error', description: 'Short name is required for a unit.', variant: 'warning' });
      return;
    }

    setQuickSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id || '')
        .maybeSingle();
      if (profileError) throw profileError;
      const companyId = profile?.company_id;
      if (!companyId) throw new Error('User profile not found');

      if (quickCreate === 'category') {
        const { data, error } = await supabase
          .from('categories')
          .insert({ name, description: null, parent_id: null, is_active: true, company_id: companyId })
          .select('id, name')
          .single();
        if (error) throw error;
        setCategories((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
        setValue('category_id', data.id);
        toast({ title: 'Category created', description: `"${name}" added and selected.`, variant: 'success' });
      }

      if (quickCreate === 'brand') {
        const { data, error } = await supabase
          .from('brands')
          .insert({ name, description: null, logo_url: null, is_active: true, company_id: companyId })
          .select('id, name')
          .single();
        if (error) throw error;
        setBrands((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
        setValue('brand_id', data.id);
        toast({ title: 'Brand created', description: `"${name}" added and selected.`, variant: 'success' });
      }

      if (quickCreate === 'unit') {
        const { data, error } = await supabase
          .from('units')
          .insert({
            name,
            short_name: quickShortName.trim(),
            base_unit_id: null,
            conversion_factor: 1,
            is_active: true,
            company_id: companyId,
          })
          .select('id, name, short_name')
          .single();
        if (error) throw error;
        setUnits((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
        setValue('unit_id', data.id);
        toast({ title: 'Unit created', description: `"${name}" added and selected.`, variant: 'success' });
      }

      setQuickCreate(null);
    } catch {
      toast({
        title: 'Error',
        description: `Failed to create ${quickCreate}. Please try again.`,
        variant: 'destructive',
      });
    } finally {
      setQuickSaving(false);
    }
  };

  const buildPayload = (data: FormData): ProductFormData => ({
    name: data.name,
    code: data.code,
    category_id: data.category_id || null,
    brand_id: data.brand_id || null,
    color: data.color || '',
    size: data.size || '',
    unit_id: data.unit_id || null,
    gst_rate: data.gst_rate ?? 0,
    hsn_sac: data.hsn_sac || '',
    description: data.description || '',
    purchase_price: data.purchase_price ?? 0,
    selling_price: data.selling_price ?? 0,
    low_stock_level: data.low_stock_level ?? 0,
    reorder_level: data.reorder_level ?? 0,
    image_url: data.image_url || '',
    barcode: data.barcode || '',
    is_active: data.is_active ?? true,
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      if (isEditing && id) {
        await updateProduct(id, buildPayload(data));
        toast({ title: 'Product updated', description: 'Product has been updated successfully.', variant: 'success' });
      } else {
        await createProduct(buildPayload(data));
        toast({ title: 'Product created', description: 'Product has been added successfully.', variant: 'success' });
      }
      navigate('/products');
    } catch {
      toast({ title: 'Error', description: 'Failed to save product.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && quickCreate === null) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quickCreate]);

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={handleBackdropClick}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-modal-title"
          className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900 shadow-2xl animate-in zoom-in-95 duration-150 text-slate-100"
        >
          {/* Header (Pinned) */}
          <div className="flex items-start justify-between border-b border-slate-800 bg-slate-900 px-6 py-4">
            <div className="space-y-0.5">
              <h2 id="product-modal-title" className="text-base font-semibold text-slate-100">
                {isEditing ? 'Edit Product' : 'Add New Product'}
              </h2>
              <p className="text-xs text-slate-400">
                {isEditing
                  ? 'Update item specifications in your inventory catalog.'
                  : 'Quickly register an item to your inventory catalog.'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {initialLoading ? (
                <div className="flex min-h-[300px] items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
                </div>
              ) : (
                <>
                  {/* Row 1 & 2: Identification */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">
                          Product Name <span className="text-rose-400">*</span>
                        </label>
                        <input
                          {...register('name')}
                          placeholder="e.g., Wireless Mechanical Keyboard"
                          className={`h-9 w-full rounded-md border bg-slate-950/60 px-3 text-xs text-slate-100 placeholder:text-slate-500 transition-colors focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 ${
                            errors.name ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500' : 'border-slate-700'
                          }`}
                        />
                        {errors.name && (
                          <p className="mt-1 text-[11px] text-rose-400">{errors.name.message}</p>
                        )}
                      </div>

                      <div className="sm:col-span-1">
                        <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">
                          Product Code / SKU <span className="text-rose-400">*</span>
                        </label>
                        <div className="flex gap-1.5">
                          <input
                            {...register('code')}
                            placeholder="PRD-001"
                            className={`h-9 min-w-0 flex-1 rounded-md border bg-slate-950/60 px-3 text-xs text-slate-100 placeholder:text-slate-500 transition-colors focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 ${
                              errors.code ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500' : 'border-slate-700'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={generateCode}
                            title="Auto-generate SKU"
                            className="inline-flex h-9 shrink-0 items-center gap-1 rounded-md border border-slate-700 bg-slate-800/80 px-2.5 text-[11px] font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-slate-100"
                          >
                            <Sparkles className="h-3 w-3 text-cyan-400" />
                            Auto
                          </button>
                        </div>
                        {errors.code && (
                          <p className="mt-1 text-[11px] text-rose-400">{errors.code.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                            Category
                          </label>
                          <button
                            type="button"
                            onClick={() => openQuickCreate('category')}
                            className="inline-flex items-center gap-0.5 text-[10px] font-medium text-cyan-400 hover:text-cyan-300"
                            title="Add category"
                          >
                            <Plus className="h-3 w-3" /> New
                          </button>
                        </div>
                        <Select
                          value={watch('category_id') || 'none'}
                          onValueChange={(v) => setValue('category_id', v === 'none' ? null : v)}
                        >
                          <SelectTrigger className="h-9 border-slate-700 bg-slate-950/60 text-xs text-slate-100 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent className="border-slate-700 bg-slate-900 text-slate-100">
                            <SelectItem value="none">No Category</SelectItem>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                            Unit of Measure
                          </label>
                          <button
                            type="button"
                            onClick={() => openQuickCreate('unit')}
                            className="inline-flex items-center gap-0.5 text-[10px] font-medium text-cyan-400 hover:text-cyan-300"
                            title="Add unit"
                          >
                            <Plus className="h-3 w-3" /> New
                          </button>
                        </div>
                        <Select
                          value={watch('unit_id') || 'none'}
                          onValueChange={(v) => setValue('unit_id', v === 'none' ? null : v)}
                        >
                          <SelectTrigger className="h-9 border-slate-700 bg-slate-950/60 text-xs text-slate-100 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500">
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                          <SelectContent className="border-slate-700 bg-slate-900 text-slate-100">
                            <SelectItem value="none">No Unit</SelectItem>
                            {units.map((u) => (
                              <SelectItem key={u.id} value={u.id}>{u.name} ({u.short_name})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                            Brand
                          </label>
                          <button
                            type="button"
                            onClick={() => openQuickCreate('brand')}
                            className="inline-flex items-center gap-0.5 text-[10px] font-medium text-cyan-400 hover:text-cyan-300"
                            title="Add brand"
                          >
                            <Plus className="h-3 w-3" /> New
                          </button>
                        </div>
                        <Select
                          value={watch('brand_id') || 'none'}
                          onValueChange={(v) => setValue('brand_id', v === 'none' ? null : v)}
                        >
                          <SelectTrigger className="h-9 border-slate-700 bg-slate-950/60 text-xs text-slate-100 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500">
                            <SelectValue placeholder="Select brand" />
                          </SelectTrigger>
                          <SelectContent className="border-slate-700 bg-slate-900 text-slate-100">
                            <SelectItem value="none">No Brand</SelectItem>
                            {brands.map((br) => (
                              <SelectItem key={br.id} value={br.id}>{br.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Pricing & Tax */}
                  <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3.5 space-y-2.5">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">
                          Purchase Price <span className="text-rose-400">*</span>
                        </label>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                            ₹
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            {...register('purchase_price', { valueAsNumber: true })}
                            placeholder="0.00"
                            className={`h-9 w-full rounded-md border bg-slate-950/60 pl-6 pr-3 text-xs text-slate-100 placeholder:text-slate-500 transition-colors focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 ${
                              errors.purchase_price ? 'border-rose-500' : 'border-slate-700'
                            }`}
                          />
                        </div>
                        {errors.purchase_price && (
                          <p className="mt-1 text-[11px] text-rose-400">{errors.purchase_price.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">
                          Selling Price <span className="text-rose-400">*</span>
                        </label>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                            ₹
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            {...register('selling_price', { valueAsNumber: true })}
                            placeholder="0.00"
                            className={`h-9 w-full rounded-md border bg-slate-950/60 pl-6 pr-3 text-xs text-slate-100 placeholder:text-slate-500 transition-colors focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 ${
                              errors.selling_price ? 'border-rose-500' : 'border-slate-700'
                            }`}
                          />
                        </div>
                        {errors.selling_price && (
                          <p className="mt-1 text-[11px] text-rose-400">{errors.selling_price.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">
                          GST / Tax Rate (%)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            {...register('gst_rate', { valueAsNumber: true })}
                            placeholder="18"
                            className="h-9 w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 pr-7 text-xs text-slate-100 placeholder:text-slate-500 transition-colors focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                          />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                            %
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Inline badges for margin & GST summary */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/90 px-2.5 py-0.5 text-[11px]">
                        <span className="text-slate-400">Margin:</span>
                        <span
                          className={`font-semibold ${
                            marginPercent < 0
                              ? 'text-rose-400'
                              : marginPercent > 20
                              ? 'text-emerald-400'
                              : 'text-cyan-400'
                          }`}
                        >
                          {marginPercent.toFixed(1)}%
                        </span>
                      </span>

                      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/90 px-2.5 py-0.5 text-[11px]">
                        <span className="text-slate-400">GST Amt:</span>
                        <span className="font-semibold text-slate-200">{formatCurrency(gstAmount)}</span>
                      </span>

                      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/90 px-2.5 py-0.5 text-[11px]">
                        <span className="text-slate-400">Incl. Tax:</span>
                        <span className="font-semibold text-slate-100">{formatCurrency(priceWithTax)}</span>
                      </span>
                    </div>
                  </div>

                  {/* Row 4: Stock & Compliance */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">
                        Barcode / EAN
                      </label>
                      <input
                        {...register('barcode')}
                        placeholder="Scan or enter barcode"
                        className="h-9 w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 text-xs text-slate-100 placeholder:text-slate-500 transition-colors focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">
                        HSN / SAC Code
                      </label>
                      <input
                        {...register('hsn_sac')}
                        placeholder="e.g., 8471"
                        className="h-9 w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 text-xs text-slate-100 placeholder:text-slate-500 transition-colors focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">
                        Reorder Level
                      </label>
                      <input
                        type="number"
                        {...register('reorder_level', { valueAsNumber: true })}
                        placeholder="5"
                        className="h-9 w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 text-xs text-slate-100 placeholder:text-slate-500 transition-colors focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                  </div>

                  {/* Active status */}
                  <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                    <div>
                      <p className="text-xs font-medium text-slate-300">Active Status</p>
                      <p className="text-[11px] text-slate-500">
                        {watch('is_active')
                          ? 'This product is active and visible'
                          : 'This product is archived'}
                      </p>
                    </div>
                    <Switch
                      checked={watch('is_active')}
                      onCheckedChange={(checked) => setValue('is_active', checked)}
                    />
                  </div>

                  {/* Progressive Disclosure ("Additional Details" Accordion) */}
                  <div className="rounded-xl border border-slate-800 bg-slate-950/30 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowAdditional((prev) => !prev)}
                      className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800/50 hover:text-slate-100"
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="text-cyan-400 font-semibold">{showAdditional ? '−' : '+'}</span>
                        <span>{showAdditional ? 'Hide Additional Details' : 'Add Description, Variants & Image'}</span>
                      </span>
                      {showAdditional ? (
                        <ChevronUp className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      )}
                    </button>

                    {showAdditional && (
                      <div className="border-t border-slate-800/80 p-3.5 space-y-3 animate-in fade-in duration-150">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">
                              Color Variant
                            </label>
                            <input
                              {...register('color')}
                              placeholder="e.g., Space Gray, Matte Black"
                              className="h-9 w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 text-xs text-slate-100 placeholder:text-slate-500 transition-colors focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">
                              Size / Dimension
                            </label>
                            <input
                              {...register('size')}
                              placeholder="e.g., XL, 500ml, 10x20cm"
                              className="h-9 w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 text-xs text-slate-100 placeholder:text-slate-500 transition-colors focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">
                            Image URL
                          </label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <input
                                {...register('image_url')}
                                placeholder="https://example.com/product.jpg"
                                className="h-9 w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 text-xs text-slate-100 placeholder:text-slate-500 transition-colors focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                              />
                            </div>
                            {imageUrl && (
                              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md border border-slate-700 bg-slate-950">
                                <img
                                  src={imageUrl}
                                  alt="Preview"
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">
                            Description
                          </label>
                          <textarea
                            {...register('description')}
                            rows={3}
                            placeholder="Brief item specifications, packaging notes, or handling details..."
                            className="w-full rounded-md border border-slate-700 bg-slate-950/60 p-2.5 text-xs text-slate-100 placeholder:text-slate-500 transition-colors focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Footer (Pinned) */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-800 bg-slate-900/80 px-6 py-3.5">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading || isSubmitting}
                className="h-9 border-slate-700 bg-transparent px-4 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-slate-100"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || isSubmitting || initialLoading}
                className="h-9 bg-cyan-600 px-4 text-xs font-medium text-white shadow-sm transition-all hover:bg-cyan-500 focus-visible:ring-1 focus-visible:ring-cyan-400 active:scale-[0.98] disabled:opacity-50"
              >
                {loading || isSubmitting ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Save className="h-3.5 w-3.5" />
                    <span>{isEditing ? 'Update Product' : 'Save Product'}</span>
                  </span>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Quick Create Dialog (Modal inside portal) */}
      <Dialog
        open={quickCreate !== null}
        onOpenChange={(open) => { if (!open) setQuickCreate(null); }}
      >
        <DialogContent className="border-slate-700 bg-slate-900 text-slate-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-100">
              {quickCreate === 'category' && 'New Category'}
              {quickCreate === 'brand' && 'New Brand'}
              {quickCreate === 'unit' && 'New Unit'}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Created instantly and selected in this product.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Name <span className="text-rose-400">*</span>
              </label>
              <input
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
                placeholder={
                  quickCreate === 'unit' ? 'e.g., Kilogram' : `Enter ${quickCreate ?? ''} name`
                }
                autoFocus
                className="h-9 w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 text-xs text-slate-100 placeholder:text-slate-500 transition-colors focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>
            {quickCreate === 'unit' && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                  Short Name <span className="text-rose-400">*</span>
                </label>
                <input
                  value={quickShortName}
                  onChange={(e) => setQuickShortName(e.target.value)}
                  placeholder="e.g., kg, pcs, box"
                  className="h-9 w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 text-xs text-slate-100 placeholder:text-slate-500 transition-colors focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setQuickCreate(null)}
              disabled={quickSaving}
              className="border-slate-700 bg-transparent text-xs text-slate-300 hover:bg-slate-800 hover:text-slate-100"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleQuickCreate}
              disabled={quickSaving}
              className="bg-cyan-600 text-xs text-white hover:bg-cyan-500"
            >
              {quickSaving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Create &amp; Select
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
