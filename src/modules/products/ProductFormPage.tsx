import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Save, X, Loader2, Upload, Tag, DollarSign, Package, Settings, Sparkles,
  Plus, Image as ImageIcon, Percent, FileCode, Boxes,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

/**
 * A `+` button rendered inside a Select trigger row. Radix Select owns its
 * trigger, so a nested button has to be rendered as a sibling and positioned
 * over the control instead of being nested inside it.
 */
function SelectQuickAdd({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="absolute right-1 top-1 h-[calc(100%-0.5rem)] w-9 shrink-0"
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <Plus className="h-4 w-4" />
    </Button>
  );
}

export default function ProductFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditing);
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
    setValue('code', code);
  };

  const openQuickCreate = (kind: Exclude<QuickCreateKind, null>) => {
    setQuickCreate(kind);
    setQuickName('');
    setQuickShortName('');
  };

  /**
   * Creates a master record inline and immediately selects it in the product
   * form. Reuses the same tables and RLS policies as the master-data tabs, so
   * no new schema or service is involved.
   */
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

  /**
   * Saves without leaving the form. Only offered when creating, since
   * re-creating an existing product id is meaningless.
   */
  const onSubmitAndAddAnother = async (data: FormData) => {
    setLoading(true);
    try {
      await createProduct(buildPayload(data));
      toast({
        title: 'Product created',
        description: 'Product saved. Fill in the next one.',
        variant: 'success',
      });
      reset({
        name: '', code: '', category_id: data.category_id, brand_id: data.brand_id,
        color: '', size: '', unit_id: data.unit_id, gst_rate: data.gst_rate ?? 18,
        hsn_sac: '', description: '', purchase_price: 0, selling_price: 0,
        low_stock_level: data.low_stock_level ?? 10, reorder_level: data.reorder_level ?? 5,
        image_url: '', barcode: '', is_active: true,
      });
    } catch {
      toast({ title: 'Error', description: 'Failed to save product.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title={isEditing ? 'Edit Product' : 'Add New Product'}
        description={isEditing ? 'Update product information' : 'Add a new product to your inventory'}
        breadcrumbs={[
          { label: 'Dashboard', onClick: () => navigate('/dashboard') },
          { label: 'Products', onClick: () => navigate('/products') },
          { label: isEditing ? 'Edit' : 'New Product' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/products')} className="gap-2">
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting || loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isEditing ? 'Update Product' : 'Save Product'}
            </Button>
          </div>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        {/* ---------------------------------------------- 1. Basic */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Tag className="h-4 w-4 text-primary" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Product Name *</label>
                  <Input
                    {...register('name')}
                    error={!!errors.name}
                    errorMessage={errors.name?.message}
                    placeholder="Enter product name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Product Code *</label>
                  <div className="flex gap-2">
                    <Input
                      {...register('code')}
                      error={!!errors.code}
                      errorMessage={errors.code?.message}
                      placeholder="e.g., PRD-001"
                      className="flex-1"
                    />
                    <Button type="button" variant="outline" onClick={generateCode} className="shrink-0 gap-1">
                      <Sparkles className="h-3 w-3" />
                      Auto
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Category</label>
                  <div className="relative">
                    <Select
                      value={watch('category_id') || 'none'}
                      onValueChange={(v) => setValue('category_id', v === 'none' ? null : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Category</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <SelectQuickAdd label="Create category" onClick={() => openQuickCreate('category')} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Brand</label>
                  <div className="relative">
                    <Select
                      value={watch('brand_id') || 'none'}
                      onValueChange={(v) => setValue('brand_id', v === 'none' ? null : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select brand" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Brand</SelectItem>
                        {brands.map((br) => (
                          <SelectItem key={br.id} value={br.id}>{br.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <SelectQuickAdd label="Create brand" onClick={() => openQuickCreate('brand')} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Unit of Measure</label>
                  <div className="relative">
                    <Select
                      value={watch('unit_id') || 'none'}
                      onValueChange={(v) => setValue('unit_id', v === 'none' ? null : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Unit</SelectItem>
                        {units.map((u) => (
                          <SelectItem key={u.id} value={u.id}>{u.name} ({u.short_name})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <SelectQuickAdd label="Create unit" onClick={() => openQuickCreate('unit')} />
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Color</label>
                  <Input {...register('color')} placeholder="e.g., Red, Blue" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Size</label>
                  <Input {...register('size')} placeholder="e.g., XL, 500ml" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* --------------------------------------------- 2. Pricing */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="h-4 w-4 text-green-500" />
                Pricing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Purchase Price *</label>
                  <Input
                    type="number"
                    step="0.01"
                    {...register('purchase_price', { valueAsNumber: true })}
                    error={!!errors.purchase_price}
                    errorMessage={errors.purchase_price?.message}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Selling Price *</label>
                  <Input
                    type="number"
                    step="0.01"
                    {...register('selling_price', { valueAsNumber: true })}
                    error={!!errors.selling_price}
                    errorMessage={errors.selling_price?.message}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <Percent className="h-3.5 w-3.5 text-muted-foreground" />
                    GST Rate (%)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    {...register('gst_rate', { valueAsNumber: true })}
                    placeholder="18"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                  Margin:{' '}
                  <span className={`font-medium ${marginPercent < 0 ? 'text-red-600' : 'text-foreground'}`}>
                    {marginPercent.toFixed(1)}%
                  </span>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                  GST Amount:{' '}
                  <span className="font-medium text-foreground">{formatCurrency(gstAmount)}</span>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                  Price incl. GST:{' '}
                  <span className="font-medium text-foreground">{formatCurrency(priceWithTax)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* -------------------------------------------- 3. Inventory */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-4 w-4 text-blue-500" />
                Inventory &amp; Thresholds
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Low Stock Level</label>
                  <Input
                    type="number"
                    {...register('low_stock_level', { valueAsNumber: true })}
                    placeholder="10"
                  />
                  <p className="text-xs text-muted-foreground">Alerts when stock falls to this level.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Reorder Level</label>
                  <Input
                    type="number"
                    {...register('reorder_level', { valueAsNumber: true })}
                    placeholder="5"
                  />
                  <p className="text-xs text-muted-foreground">Suggested quantity when reordering.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Barcode</label>
                  <Input {...register('barcode')} placeholder="Enter barcode" />
                  <p className="text-xs text-muted-foreground">Used by the barcode scanner search.</p>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <FileCode className="h-3.5 w-3.5 text-muted-foreground" />
                    HSN/SAC Code
                  </label>
                  <Input {...register('hsn_sac')} placeholder="e.g., 8471" />
                  <p className="text-xs text-muted-foreground">Required for GST invoicing.</p>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                <Boxes className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Opening stock, warehouse and rack are managed from the Stock module
                  (stock movements and adjustments). Setting them here would bypass
                  stock ledgers and break inventory valuation.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ---------------------------------------------- 4. Details */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileCode className="h-4 w-4 text-amber-500" />
                Additional Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Description</label>
                <Textarea
                  {...register('description')}
                  placeholder="Product description (optional)"
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ---------------------------------------------- 5. Images */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ImageIcon className="h-4 w-4 text-cyan-500" />
                Images
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="h-32 w-32 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
                  {imageUrl ? (
                    <img src={imageUrl} alt="Product preview" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1">
                      <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                      <span className="text-[10px] text-muted-foreground">No image</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-medium text-foreground">Image URL</label>
                  <div className="flex gap-2">
                    <Input {...register('image_url')} placeholder="https://..." className="flex-1" />
                    <Button type="button" variant="outline" size="icon" title="Upload image">
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Paste a publicly reachable image URL. The catalog stores a single
                    image per product.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ------------------------------------------ Status toggle */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="h-4 w-4 text-purple-500" />
                Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Active Status</p>
                  <p className="text-xs text-muted-foreground">
                    {watch('is_active') ? 'This product is active and visible' : 'This product is archived'}
                  </p>
                </div>
                <Switch
                  checked={watch('is_active')}
                  onCheckedChange={(checked) => setValue('is_active', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-3 pb-6 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => navigate('/products')}>
            Cancel
          </Button>
          {!isEditing && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleSubmit(onSubmitAndAddAnother)}
              disabled={isSubmitting || loading}
              className="gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Save &amp; Add Another
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting || loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEditing ? 'Update Product' : 'Save Product'}
          </Button>
        </div>
      </form>

      {/* ------------------------------------- Quick-create dialogs */}
      <Dialog
        open={quickCreate !== null}
        onOpenChange={(open) => { if (!open) setQuickCreate(null); }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {quickCreate === 'category' && 'New Category'}
              {quickCreate === 'brand' && 'New Brand'}
              {quickCreate === 'unit' && 'New Unit'}
            </DialogTitle>
            <DialogDescription>
              Created instantly and selected in this product. You can edit it later
              from the {quickCreate} tab in Product Management.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Name *</label>
              <Input
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
                placeholder={
                  quickCreate === 'unit' ? 'e.g. Dozen' : `Enter ${quickCreate ?? ''} name`
                }
                autoFocus
              />
            </div>
            {quickCreate === 'unit' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Short Name *</label>
                <Input
                  value={quickShortName}
                  onChange={(e) => setQuickShortName(e.target.value)}
                  placeholder="e.g. dz"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickCreate(null)} disabled={quickSaving}>
              Cancel
            </Button>
            <Button onClick={handleQuickCreate} disabled={quickSaving}>
              {quickSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create &amp; Select
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}