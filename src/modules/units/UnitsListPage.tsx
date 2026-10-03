import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Pencil, Trash2, LayoutGrid, List, Loader2, Ruler, Layers,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import type { Unit } from '@/types/database.types';
import type { UnitWithBase } from '@/types/product.types';

/**
 * Embeddable unit management panel, rendered as a tab inside the Product
 * workspace and reused by the standalone `/units` route wrapper below.
 */
export function UnitPanel() {
  const { toast } = useToast();

  const [units, setUnits] = useState<UnitWithBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string; name: string }>({
    open: false, id: '', name: '',
  });
  const [formLoading, setFormLoading] = useState(false);

  const [formName, setFormName] = useState('');
  const [formShortName, setFormShortName] = useState('');
  const [formBaseUnitId, setFormBaseUnitId] = useState<string>('');
  const [formConversionFactor, setFormConversionFactor] = useState<string>('1');
  const [formIsActive, setFormIsActive] = useState(true);

  const fetchUnits = useCallback(async () => {
    setLoading(true);
    try {
      const { data: unitsData, error } = await supabase
        .from('units')
        .select('*')
        .order('name');

      if (error) throw error;

      const rows = (unitsData || []) as Unit[];

      const { data: products } = await supabase
        .from('products')
        .select('unit_id')
        .eq('is_active', true);

      const countMap: Record<string, number> = {};
      (products || []).forEach((p) => {
        if (p.unit_id) {
          countMap[p.unit_id] = (countMap[p.unit_id] || 0) + 1;
        }
      });

      const enriched: UnitWithBase[] = rows.map((u) => ({
        ...u,
        base_unit: rows.find((r) => r.id === u.base_unit_id) || null,
        child_units: rows.filter((r) => r.base_unit_id === u.id && r.id !== u.id),
        product_count: countMap[u.id] || 0,
      }));

      setUnits(enriched);
    } catch {
      toast({ title: 'Error', description: 'Failed to fetch units.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchUnits(); }, [fetchUnits]);

  const baseUnitOptions = units.filter(
    (u) => (!u.base_unit_id) && u.id !== editingUnit?.id
  );

  const openCreateDialog = () => {
    setEditingUnit(null);
    setFormName('');
    setFormShortName('');
    setFormBaseUnitId('');
    setFormConversionFactor('1');
    setFormIsActive(true);
    setDialogOpen(true);
  };

  const openEditDialog = (unit: Unit) => {
    setEditingUnit(unit);
    setFormName(unit.name);
    setFormShortName(unit.short_name);
    setFormBaseUnitId(unit.base_unit_id || '');
    setFormConversionFactor(String(unit.conversion_factor || 1));
    setFormIsActive(unit.is_active);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formShortName.trim()) {
      toast({ title: 'Validation error', description: 'Name and short name are required.', variant: 'warning' });
      return;
    }
    if (formBaseUnitId && formBaseUnitId === editingUnit?.id) {
      toast({ title: 'Validation error', description: 'A unit cannot be its own base unit.', variant: 'warning' });
      return;
    }
    const conversionFactor = formBaseUnitId ? Number(formConversionFactor) || 1 : 1;
    setFormLoading(true);
    try {
      if (editingUnit) {
        const { error } = await supabase
          .from('units')
          .update({
            name: formName.trim(),
            short_name: formShortName.trim(),
            base_unit_id: formBaseUnitId || null,
            conversion_factor: conversionFactor,
            is_active: formIsActive,
          })
          .eq('id', editingUnit.id);
        if (error) throw error;
        toast({ title: 'Unit updated', description: 'Unit has been updated.', variant: 'success' });
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user?.id || '').single();
        const { error } = await supabase.from('units').insert({
          name: formName.trim(),
          short_name: formShortName.trim(),
          base_unit_id: formBaseUnitId || null,
          conversion_factor: conversionFactor,
          is_active: formIsActive,
          company_id: profile?.company_id || '',
        });
        if (error) throw error;
        toast({ title: 'Unit created', description: 'New unit has been added.', variant: 'success' });
      }
      setDialogOpen(false);
      fetchUnits();
    } catch {
      toast({ title: 'Error', description: 'Failed to save unit.', variant: 'destructive' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase.from('units').delete().eq('id', deleteDialog.id);
      if (error) throw error;
      toast({ title: 'Unit deleted', description: `${deleteDialog.name} has been deleted.`, variant: 'success' });
      setDeleteDialog({ open: false, id: '', name: '' });
      fetchUnits();
    } catch {
      toast({ title: 'Error', description: 'Failed to delete unit. Remove it from products first.', variant: 'destructive' });
    }
  };

  const filteredUnits = units.filter((u) =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.short_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search units..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={openCreateDialog} className="gap-2 sm:shrink-0">
              <Plus className="h-4 w-4" />
              Add Unit
            </Button>
            <div className="flex items-center gap-1 rounded-lg border border-border p-1 sm:shrink-0">
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-3">
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
      ) : filteredUnits.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={<Ruler className="h-8 w-8 text-muted-foreground/60" />}
              title="No units found"
              description={searchQuery ? 'Try a different search term.' : 'Create your first unit of measurement.'}
              action={!searchQuery ? { label: 'Add Unit', onClick: openCreateDialog } : undefined}
            />
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <>
            {filteredUnits.map((unit) => (
              <div key={unit.id} >
                <Card className="group transition-all hover:shadow-md">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
                        <Ruler className="h-5 w-5 text-muted-foreground/60" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-medium text-foreground">{unit.name}</h3>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {unit.short_name}
                          {unit.base_unit
                            ? ` = ${unit.conversion_factor} × ${unit.base_unit.short_name}`
                            : ' · base unit'}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <Badge variant={unit.is_active ? 'success' : 'destructive'} className="text-[10px]">
                            {unit.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {unit.product_count || 0} products
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(unit)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-600"
                        onClick={() => setDeleteDialog({ open: true, id: unit.id, name: unit.name })}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              <>
                {filteredUnits.map((unit) => (
                  <div key={unit.id}  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
                      <Ruler className="h-4 w-4 text-muted-foreground/60" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-medium text-foreground">{unit.name}</h3>
                      {unit.base_unit ? (
                        <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                          <Layers className="h-3 w-3" />
                          {unit.conversion_factor} × {unit.base_unit.name} ({unit.base_unit.short_name})
                        </p>
                      ) : (
                        <p className="truncate text-xs text-muted-foreground">Base unit</p>
                      )}
                    </div>
                    <Badge variant={unit.is_active ? 'success' : 'destructive'} className="text-xs">
                      {unit.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {unit.product_count || 0} products
                    </span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(unit)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-600"
                        onClick={() => setDeleteDialog({ open: true, id: unit.id, name: unit.name })}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUnit ? 'Edit Unit' : 'Add Unit'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Name *</label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Box"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Short Name *</label>
              <Input
                value={formShortName}
                onChange={(e) => setFormShortName(e.target.value)}
                placeholder="e.g. bx"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Base Unit</label>
              <Select
                value={formBaseUnitId}
                onValueChange={(v) => {
                  setFormBaseUnitId(v);
                  setFormConversionFactor(v ? '1' : '1');
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="This is a base unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— Base unit (no parent) —</SelectItem>
                  {baseUnitOptions.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.short_name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formBaseUnitId && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Conversion Factor *</label>
                <Input
                  type="number"
                  min="0.000001"
                  step="any"
                  value={formConversionFactor}
                  onChange={(e) => setFormConversionFactor(e.target.value)}
                  placeholder="Units per base unit, e.g. 12"
                />
                <p className="text-xs text-muted-foreground">
                  1 {formShortName || 'unit'} = {formConversionFactor || '1'} {baseUnitOptions.find((u) => u.id === formBaseUnitId)?.short_name || 'base unit'}
                </p>
              </div>
            )}
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-xs text-muted-foreground">Show this unit in listings</p>
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
              {editingUnit ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog((prev) => ({ ...prev, open }))}
        title="Delete Unit"
        description={`Are you sure you want to delete "${deleteDialog.name}"? Products using this unit will keep their current unit value.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
      />
    </div>
  );
}

/**
 * Standalone `/units` route. Kept so existing bookmarks and deep links keep
 * working; the add action lives inside the panel itself.
 */
export default function UnitsListPage() {
  const navigate = useNavigate();
  return (
    <div className="space-y-3">
      <PageHeader
        title="Units"
        description="Manage units of measurement and their conversions"
        breadcrumbs={[
          { label: 'Dashboard', onClick: () => navigate('/dashboard') },
          { label: 'Products', onClick: () => navigate('/products') },
          { label: 'Units' },
        ]}
      />
      <UnitPanel />
    </div>
  );
}