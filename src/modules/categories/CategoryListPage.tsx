import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, ChevronRight, ChevronDown, Pencil, Trash2, FolderTree, Loader2,
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import type { Category } from '@/types/database.types';
import type { CategoryWithChildren } from '@/types/product.types';

interface CategoryTreeNodeProps {
  cat: CategoryWithChildren;
  depth: number;
  onCreateChild: (parentId: string) => void;
  onEdit: (cat: Category) => void;
  onDelete: (id: string, name: string) => void;
}

/**
 * One node of the category tree. This has to be its own component: the
 * previous version was a plain recursive `renderCategory` helper calling
 * `useState`, so every node appended hooks to the *page* component's hook
 * list and the count changed with the tree shape.
 */
function CategoryTreeNode({
  cat,
  depth,
  onCreateChild,
  onEdit,
  onDelete,
}: CategoryTreeNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = Boolean(cat.children && cat.children.length > 0);

  return (
    <div>
      <div
        className="flex items-center gap-2 rounded-lg border border-transparent px-3 py-2.5 transition-colors hover:bg-muted/50"
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
      >
        {hasChildren ? (
          <button
            onClick={() => setExpanded((prev) => !prev)}
            className="rounded p-0.5 text-muted-foreground hover:bg-muted"
            aria-label={expanded ? 'Collapse category' : 'Expand category'}
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : (
          <div className="w-6" />
        )}
        <FolderTree className="h-4 w-4 text-amber-500" />
        <span className="flex-1 text-sm font-medium text-foreground">{cat.name}</span>
        {cat.product_count !== undefined && cat.product_count > 0 && (
          <Badge variant="secondary" className="text-xs">
            {cat.product_count} products
          </Badge>
        )}
        <Badge variant={cat.is_active ? 'success' : 'destructive'} className="text-xs">
          {cat.is_active ? 'Active' : 'Inactive'}
        </Badge>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onCreateChild(cat.id)}>
          <Plus className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(cat)}>
          <Pencil className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-red-500 hover:text-red-600"
          onClick={() => onDelete(cat.id, cat.name)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      <AnimatePresence>
        {expanded && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {cat.children!.map((child) => (
              <CategoryTreeNode
                key={child.id}
                cat={child}
                depth={depth + 1}
                onCreateChild={onCreateChild}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CategoryListPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [categories, setCategories] = useState<CategoryWithChildren[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string; name: string }>({
    open: false, id: '', name: '',
  });
  const [formLoading, setFormLoading] = useState(false);

  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formParentId, setFormParentId] = useState<string | null>(null);
  const [formIsActive, setFormIsActive] = useState(true);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;

      const flat = (data || []) as Category[];
      const productCounts = await supabase
        .from('products')
        .select('category_id')
        .eq('is_active', true);

      const countMap: Record<string, number> = {};
      (productCounts.data || []).forEach((p) => {
        if (p.category_id) {
          countMap[p.category_id] = (countMap[p.category_id] || 0) + 1;
        }
      });

      const tree = buildTree(flat, countMap);
      setCategories(tree);
    } catch {
      toast({ title: 'Error', description: 'Failed to fetch categories.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const buildTree = (flat: Category[], counts: Record<string, number>): CategoryWithChildren[] => {
    const map = new Map<string, CategoryWithChildren>();
    const roots: CategoryWithChildren[] = [];

    flat.forEach((cat) => {
      map.set(cat.id, { ...cat, children: [], product_count: counts[cat.id] || 0 });
    });

    flat.forEach((cat) => {
      const node = map.get(cat.id)!;
      if (cat.parent_id && map.has(cat.parent_id)) {
        map.get(cat.parent_id)!.children!.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

  const openCreateDialog = (parentId?: string | null) => {
    setEditingCategory(null);
    setFormName('');
    setFormDescription('');
    setFormParentId(parentId || null);
    setFormIsActive(true);
    setDialogOpen(true);
  };

  const openEditDialog = (cat: Category) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormDescription(cat.description || '');
    setFormParentId(cat.parent_id);
    setFormIsActive(cat.is_active);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast({ title: 'Validation error', description: 'Category name is required.', variant: 'warning' });
      return;
    }
    setFormLoading(true);
    try {
      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update({
            name: formName.trim(),
            description: formDescription.trim() || null,
            parent_id: formParentId,
            is_active: formIsActive,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingCategory.id);
        if (error) throw error;
        toast({ title: 'Category updated', description: 'Category has been updated.', variant: 'success' });
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user?.id || '').single();
        const { error } = await supabase.from('categories').insert({
          name: formName.trim(),
          description: formDescription.trim() || null,
          parent_id: formParentId,
          is_active: formIsActive,
          company_id: profile?.company_id || '',
        });
        if (error) throw error;
        toast({ title: 'Category created', description: 'New category has been added.', variant: 'success' });
      }
      setDialogOpen(false);
      fetchCategories();
    } catch {
      toast({ title: 'Error', description: 'Failed to save category.', variant: 'destructive' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase.from('categories').delete().eq('id', deleteDialog.id);
      if (error) throw error;
      toast({ title: 'Category deleted', description: `${deleteDialog.name} has been deleted.`, variant: 'success' });
      setDeleteDialog({ open: false, id: '', name: '' });
      fetchCategories();
    } catch {
      toast({ title: 'Error', description: 'Failed to delete category. It may have subcategories or products.', variant: 'destructive' });
    }
  };

  const flatCategories = categories.reduce<Category[]>((acc, cat) => {
    acc.push(cat);
    if (cat.children) {
      cat.children.forEach((child) => acc.push(child));
    }
    return acc;
  }, []);

  const filteredTree = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (cat.children || []).some((child) => child.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );


  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description="Organize your products with categories"
        breadcrumbs={[
          { label: 'Dashboard', onClick: () => navigate('/dashboard') },
          { label: 'Products', onClick: () => navigate('/products') },
          { label: 'Categories' },
        ]}
        actions={
          <Button onClick={() => openCreateDialog()} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Category
          </Button>
        }
      />

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16 ml-auto" />
                </div>
              ))}
            </div>
          ) : filteredTree.length === 0 ? (
            <EmptyState
              icon={<FolderTree className="h-8 w-8 text-muted-foreground/60" />}
              title="No categories found"
              description={searchQuery ? 'Try a different search term.' : 'Create your first category to organize products.'}
              action={!searchQuery ? { label: 'Add Category', onClick: () => openCreateDialog() } : undefined}
            />
          ) : (
            <div className="space-y-1">
              {filteredTree.map((cat) => (
                <CategoryTreeNode
                  key={cat.id}
                  cat={cat}
                  depth={0}
                  onCreateChild={(parentId) => openCreateDialog(parentId)}
                  onEdit={openEditDialog}
                  onDelete={(id, name) => setDeleteDialog({ open: true, id, name })}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Add Category'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Name *</label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Category name"
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
              <label className="text-sm font-medium text-foreground">Parent Category</label>
              <Select
                value={formParentId || 'none'}
                onValueChange={(v) => setFormParentId(v === 'none' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None (Top-level)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Top-level)</SelectItem>
                  {flatCategories
                    .filter((c) => c.id !== editingCategory?.id)
                    .map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-xs text-muted-foreground">Show this category in listings</p>
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
              {editingCategory ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog((prev) => ({ ...prev, open }))}
        title="Delete Category"
        description={`Are you sure you want to delete "${deleteDialog.name}"? Products in this category will become uncategorized.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
      />
    </div>
  );
}
