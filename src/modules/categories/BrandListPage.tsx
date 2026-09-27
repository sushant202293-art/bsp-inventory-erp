import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Pencil, Trash2, LayoutGrid, List, Loader2, Building2, Upload,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import type { Brand } from '@/types/database.types';
import type { BrandWithStats } from '@/types/product.types';

export default function BrandListPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [brands, setBrands] = useState<BrandWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string; name: string }>({
    open: false, id: '', name: '',
  });
  const [formLoading, setFormLoading] = useState(false);

  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formLogoUrl, setFormLogoUrl] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  const fetchBrands = useCallback(async () => {
    setLoading(true);
    try {
      const { data: brandsData, error } = await supabase
        .from('brands')
        .select('*')
        .order('name');

      if (error) throw error;

      const { data: products } = await supabase
        .from('products')
        .select('brand_id')
        .eq('is_active', true);

      const countMap: Record<string, number> = {};
      (products || []).forEach((p) => {
        if (p.brand_id) {
          countMap[p.brand_id] = (countMap[p.brand_id] || 0) + 1;
        }
      });

      const enriched = (brandsData || []).map((b) => ({
        ...b,
        product_count: countMap[b.id] || 0,
      })) as BrandWithStats[];

      setBrands(enriched);
    } catch {
      toast({ title: 'Error', description: 'Failed to fetch brands.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchBrands(); }, [fetchBrands]);

  const openCreateDialog = () => {
    setEditingBrand(null);
    setFormName('');
    setFormDescription('');
    setFormLogoUrl('');
    setFormIsActive(true);
    setDialogOpen(true);
  };

  const openEditDialog = (brand: Brand) => {
    setEditingBrand(brand);
    setFormName(brand.name);
    setFormDescription(brand.description || '');
    setFormLogoUrl(brand.logo_url || '');
    setFormIsActive(brand.is_active);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast({ title: 'Validation error', description: 'Brand name is required.', variant: 'warning' });
      return;
    }
    setFormLoading(true);
    try {
      if (editingBrand) {
        const { error } = await supabase
          .from('brands')
          .update({
            name: formName.trim(),
            description: formDescription.trim() || null,
            logo_url: formLogoUrl.trim() || null,
            is_active: formIsActive,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingBrand.id);
        if (error) throw error;
        toast({ title: 'Brand updated', description: 'Brand has been updated.', variant: 'success' });
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user?.id || '').single();
        const { error } = await supabase.from('brands').insert({
          name: formName.trim(),
          description: formDescription.trim() || null,
          logo_url: formLogoUrl.trim() || null,
          is_active: formIsActive,
          company_id: profile?.company_id || '',
        });
        if (error) throw error;
        toast({ title: 'Brand created', description: 'New brand has been added.', variant: 'success' });
      }
      setDialogOpen(false);
      fetchBrands();
    } catch {
      toast({ title: 'Error', description: 'Failed to save brand.', variant: 'destructive' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase.from('brands').delete().eq('id', deleteDialog.id);
      if (error) throw error;
      toast({ title: 'Brand deleted', description: `${deleteDialog.name} has been deleted.`, variant: 'success' });
      setDeleteDialog({ open: false, id: '', name: '' });
      fetchBrands();
    } catch {
      toast({ title: 'Error', description: 'Failed to delete brand. It may be assigned to products.', variant: 'destructive' });
    }
  };

  const filteredBrands = brands.filter((b) =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Brands"
        description="Manage product brands"
        breadcrumbs={[
          { label: 'Dashboard', onClick: () => navigate('/dashboard') },
          { label: 'Products', onClick: () => navigate('/products') },
          { label: 'Brands' },
        ]}
        actions={
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Brand
          </Button>
        }
      />

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search brands..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-border p-1">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredBrands.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={<Building2 className="h-8 w-8 text-muted-foreground/60" />}
              title="No brands found"
              description={searchQuery ? 'Try a different search term.' : 'Create your first brand to organize products.'}
              action={!searchQuery ? { label: 'Add Brand', onClick: openCreateDialog } : undefined}
            />
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence>
            {filteredBrands.map((brand) => (
              <motion.div
                key={brand.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="group transition-all hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
                        {brand.logo_url ? (
                          <img src={brand.logo_url} alt={brand.name} className="h-8 w-8 rounded object-contain" />
                        ) : (
                          <Building2 className="h-5 w-5 text-muted-foreground/60" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-medium text-foreground">{brand.name}</h3>
                        {brand.description && (
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">{brand.description}</p>
                        )}
                        <div className="mt-2 flex items-center gap-2">
                          <Badge variant={brand.is_active ? 'success' : 'destructive'} className="text-[10px]">
                            {brand.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {brand.product_count || 0} products
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(brand)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-600"
                        onClick={() => setDeleteDialog({ open: true, id: brand.id, name: brand.name })}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              <AnimatePresence>
                {filteredBrands.map((brand) => (
                  <motion.div
                    key={brand.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
                      {brand.logo_url ? (
                        <img src={brand.logo_url} alt={brand.name} className="h-6 w-6 rounded object-contain" />
                      ) : (
                        <Building2 className="h-4 w-4 text-muted-foreground/60" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-medium text-foreground">{brand.name}</h3>
                      {brand.description && (
                        <p className="truncate text-xs text-muted-foreground">{brand.description}</p>
                      )}
                    </div>
                    <Badge variant={brand.is_active ? 'success' : 'destructive'} className="text-xs">
                      {brand.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {brand.product_count || 0} products
                    </span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(brand)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-600"
                        onClick={() => setDeleteDialog({ open: true, id: brand.id, name: brand.name })}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingBrand ? 'Edit Brand' : 'Add Brand'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Name *</label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Brand name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Description</label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Logo URL</label>
              <div className="flex gap-2">
                <Input
                  value={formLogoUrl}
                  onChange={(e) => setFormLogoUrl(e.target.value)}
                  placeholder="https://..."
                  className="flex-1"
                />
                <Button type="button" variant="outline" size="icon">
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-xs text-muted-foreground">Show this brand in listings</p>
              </div>
              <Switch checked={formIsActive} onCheckedChange={setFormIsActive} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={formLoading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={formLoading}>
              {formLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editingBrand ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog((prev) => ({ ...prev, open }))}
        title="Delete Brand"
        description={`Are you sure you want to delete "${deleteDialog.name}"? Products with this brand will become unbranded.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
      />
    </div>
  );
}
