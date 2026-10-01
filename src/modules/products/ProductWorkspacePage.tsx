import { useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Package, Tags, Building2, Ruler, Lock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { usePermissions } from '@/contexts/PermissionContext';
import { ProductListPanel } from '@/modules/products/ProductListPage';
import { CategoryPanel } from '@/modules/categories/CategoryListPage';
import { BrandPanel } from '@/modules/categories/BrandListPage';
import { UnitPanel } from '@/modules/units/UnitsListPage';

type WorkspaceTab = 'products' | 'categories' | 'brands' | 'units';

interface TabConfig {
  value: WorkspaceTab;
  label: string;
  icon: LucideIcon;
  /** Permission module required to see this tab. */
  module: string;
  description: string;
}

const TABS: TabConfig[] = [
  {
    value: 'products',
    label: 'Products',
    icon: Package,
    module: 'products',
    description: 'Search, filter and manage every product in your catalog.',
  },
  {
    value: 'categories',
    label: 'Categories',
    icon: Tags,
    module: 'categories',
    description: 'Organize products into a nested category tree.',
  },
  {
    value: 'brands',
    label: 'Brands',
    icon: Building2,
    module: 'brands',
    description: 'Maintain the brands products can be assigned to.',
  },
  {
    value: 'units',
    label: 'Units',
    icon: Ruler,
    module: 'units',
    description: 'Define units of measurement and their conversions.',
  },
];

function isWorkspaceTab(value: string | null): value is WorkspaceTab {
  return TABS.some((tab) => tab.value === value);
}

/**
 * Single Product Management workspace. Categories, Brands and Units are tabs
 * inside this screen rather than separate sidebar entries, so the whole catalog
 * can be managed from one place. The standalone `/categories`, `/brands` and
 * `/units` routes still exist and render the same panels.
 *
 * The active tab lives in the `tab` query param so tabs are linkable and the
 * browser back button behaves as expected.
 */
export default function ProductWorkspacePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { canAccess, canCreate, loading: permissionsLoading } = usePermissions();

  const requestedTab = searchParams.get('tab');
  const visibleTabs = useMemo(
    () => TABS.filter((tab) => canAccess(tab.module)),
    [canAccess]
  );

  const visibleValues = visibleTabs.map((tab) => tab.value);
  const activeTab: WorkspaceTab =
    isWorkspaceTab(requestedTab) && visibleValues.includes(requestedTab)
      ? requestedTab
      : visibleValues[0] || 'products';

  const activeConfig = TABS.find((tab) => tab.value === activeTab) ?? TABS[0];

  const handleTabChange = useCallback(
    (value: string) => {
      if (!isWorkspaceTab(value)) return;
      const next = new URLSearchParams(searchParams);
      next.set('tab', value);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const hasNoAccess = !permissionsLoading && visibleTabs.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Management"
        description="Manage products, categories, brands and units from one place"
        breadcrumbs={[
          { label: 'Dashboard', onClick: () => navigate('/dashboard') },
          { label: 'Products' },
        ]}
        actions={
          canCreate('products') ? (
            <Button onClick={() => navigate('/products/new')} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          ) : null
        }
      />

      {hasNoAccess ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={<Lock className="h-8 w-8 text-muted-foreground/60" />}
              title="No catalog access"
              description="Your role does not have permission to view products, categories, brands or units."
            />
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          {/*
            Horizontally scrollable on small screens instead of wrapping or
            overflowing the viewport.
          */}
          <div className="overflow-x-auto pb-1">
            <TabsList className="inline-flex w-max min-w-full">
              {visibleTabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="gap-2">
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {visibleTabs.map((tab) => (
            <TabsContent key={tab.value} value={tab.value}>
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
              >
                {tab.value === 'products' && <ProductListPanel />}
                {tab.value === 'categories' && <CategoryPanel />}
                {tab.value === 'brands' && <BrandPanel />}
                {tab.value === 'units' && <UnitPanel />}
              </motion.div>
            </TabsContent>
          ))}
        </Tabs>
      )}

      {!hasNoAccess && activeConfig && (
        <p className="text-xs text-muted-foreground">{activeConfig.description}</p>
      )}
    </div>
  );
}