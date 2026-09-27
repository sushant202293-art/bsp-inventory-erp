import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import {
  Save, X, Loader2, Upload, Tag, DollarSign, Package, Settings, Sparkles,
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
import { useToast } from '@/components/ui/use-toast';
import { getProduct, createProduct, updateProduct } from '@/services/product.service';
import { supabase } from '@/lib/supabase';
import { generateId } from '@/lib/utils';
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

  const watchedCode = watch('code');

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

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const payload: ProductFormData = {
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
      };

      if (isEditing && id) {
        await updateProduct(id, payload);
        toast({ title: 'Product updated', description: 'Product has been updated successfully.', variant: 'success' });
      } else {
        await createProduct(payload);
        toast({ title: 'Product created', description: 'Product has been added successfully.', variant: 'success' });
      }
      navigate('/products');
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
    <div className="space-y-6">
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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Tag className="h-4 w-4 text-primary" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
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

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Category</label>
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
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Brand</label>
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
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Unit</label>
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
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Color</label>
                  <Input {...register('color')} placeholder="e.g., Red, Blue" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Size</label>
                  <Input {...register('size')} placeholder="e.g., XL, 500ml" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Description</label>
                <Textarea
                  {...register('description')}
                  placeholder="Product description (optional)"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="h-4 w-4 text-green-500" />
                Pricing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
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
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                  Margin:{' '}
                  <span className="font-medium text-foreground">
                    {watch('selling_price') && watch('purchase_price')
                      ? `${(((watch('selling_price') - watch('purchase_price')) / watch('purchase_price')) * 100).toFixed(1)}%`
                      : '0%'}
                  </span>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                  GST Amount:{' '}
                  <span className="font-medium text-foreground">
                    ₹{(((watch('selling_price') ?? 0) * (watch('gst_rate') ?? 0)) / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-4 w-4 text-blue-500" />
                Stock & Tax
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">GST Rate (%)</label>
                  <Input
                    type="number"
                    step="0.01"
                    {...register('gst_rate', { valueAsNumber: true })}
                    placeholder="18"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">HSN/SAC Code</label>
                  <Input {...register('hsn_sac')} placeholder="e.g., 8471" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Low Stock Level</label>
                  <Input
                    type="number"
                    {...register('low_stock_level', { valueAsNumber: true })}
                    placeholder="10"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Reorder Level</label>
                  <Input
                    type="number"
                    {...register('reorder_level', { valueAsNumber: true })}
                    placeholder="5"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Barcode</label>
                  <Input {...register('barcode')} placeholder="Enter barcode" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Image URL</label>
                  <div className="flex gap-2">
                    <Input {...register('image_url')} placeholder="https://..." className="flex-1" />
                    <Button type="button" variant="outline" size="icon">
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="h-4 w-4 text-purple-500" />
                Additional Settings
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
        </motion.div>

        <div className="flex justify-end gap-3 pb-6">
          <Button type="button" variant="outline" onClick={() => navigate('/products')}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEditing ? 'Update Product' : 'Save Product'}
          </Button>
        </div>
      </form>
    </div>
  );
}
