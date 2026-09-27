export const MODULES = {
  DASHBOARD: 'dashboard',
  PRODUCTS: 'products',
  CUSTOMERS: 'customers',
  SUPPLIERS: 'suppliers',
  TRANSACTIONS: 'transactions',
  STOCK: 'stock',
  PAYMENTS: 'payments',
  LEDGERS: 'ledgers',
  REPORTS: 'reports',
  ADMIN: 'admin',
  SETTINGS: 'settings',
} as const;

export const ACTIONS = {
  VIEW: 'view',
  CREATE: 'create',
  EDIT: 'edit',
  DELETE: 'delete',
  EXPORT: 'export',
  IMPORT: 'import',
  PRINT: 'print',
  APPROVE: 'approve',
} as const;

export type ModuleId = (typeof MODULES)[keyof typeof MODULES];
export type ActionId = (typeof ACTIONS)[keyof typeof ACTIONS];

export type Permission =
  | `${ModuleId}.${ActionId}`
  | 'products.categories'
  | 'products.brands'
  | 'products.units'
  | 'transactions.sales'
  | 'transactions.sales.create'
  | 'transactions.sales.edit'
  | 'transactions.sales.delete'
  | 'transactions.sales.print'
  | 'transactions.quotations'
  | 'transactions.quotations.create'
  | 'transactions.quotations.edit'
  | 'transactions.quotations.delete'
  | 'transactions.purchases'
  | 'transactions.purchases.create'
  | 'transactions.purchases.edit'
  | 'transactions.purchases.delete'
  | 'transactions.proforma'
  | 'transactions.proforma.create'
  | 'transactions.proforma.edit'
  | 'transactions.proforma.delete'
  | 'stock.movements'
  | 'stock.adjustments'
  | 'stock.transfers'
  | 'stock.alerts'
  | 'stock.reorder'
  | 'payments.received'
  | 'payments.received.create'
  | 'payments.paid'
  | 'payments.paid.create'
  | 'ledgers.customers'
  | 'ledgers.suppliers'
  | 'reports.sales'
  | 'reports.purchases'
  | 'reports.stock'
  | 'reports.gst'
  | 'reports.profit_loss'
  | 'admin.users'
  | 'admin.users.create'
  | 'admin.users.edit'
  | 'admin.users.delete'
  | 'settings.themes'
  | 'settings.backup';

export const ALL_PERMISSIONS: Permission[] = [
  'dashboard.view',
  'products.view',
  'products.create',
  'products.edit',
  'products.delete',
  'products.export',
  'products.import',
  'products.categories',
  'products.brands',
  'products.units',
  'customers.view',
  'customers.create',
  'customers.edit',
  'customers.delete',
  'customers.export',
  'suppliers.view',
  'suppliers.create',
  'suppliers.edit',
  'suppliers.delete',
  'suppliers.export',
  'transactions.view',
  'transactions.sales',
  'transactions.sales.create',
  'transactions.sales.edit',
  'transactions.sales.delete',
  'transactions.sales.print',
  'transactions.quotations',
  'transactions.quotations.create',
  'transactions.quotations.edit',
  'transactions.quotations.delete',
  'transactions.purchases',
  'transactions.purchases.create',
  'transactions.purchases.edit',
  'transactions.purchases.delete',
  'transactions.proforma',
  'transactions.proforma.create',
  'transactions.proforma.edit',
  'transactions.proforma.delete',
  'stock.view',
  'stock.movements',
  'stock.adjustments',
  'stock.transfers',
  'stock.alerts',
  'stock.reorder',
  'payments.view',
  'payments.received',
  'payments.received.create',
  'payments.paid',
  'payments.paid.create',
  'ledgers.view',
  'ledgers.customers',
  'ledgers.suppliers',
  'reports.view',
  'reports.sales',
  'reports.purchases',
  'reports.stock',
  'reports.gst',
  'reports.profit_loss',
  'admin.users',
  'admin.users.create',
  'admin.users.edit',
  'admin.users.delete',
  'settings.view',
  'settings.edit',
  'settings.themes',
  'settings.backup',
] as const;

export interface SystemRole {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  isSystem: boolean;
}

export const SYSTEM_ROLES: SystemRole[] = [
  {
    id: 'admin',
    name: 'Administrator',
    description: 'Full access to all modules and features',
    permissions: [...ALL_PERMISSIONS],
    isSystem: true,
  },
  {
    id: 'manager',
    name: 'Manager',
    description: 'Can manage most operations except system settings',
    permissions: [
      'dashboard.view',
      'products.view',
      'products.create',
      'products.edit',
      'products.export',
      'products.categories',
      'products.brands',
      'products.units',
      'customers.view',
      'customers.create',
      'customers.edit',
      'customers.export',
      'suppliers.view',
      'suppliers.create',
      'suppliers.edit',
      'suppliers.export',
      'transactions.view',
      'transactions.sales',
      'transactions.sales.create',
      'transactions.sales.edit',
      'transactions.sales.print',
      'transactions.quotations',
      'transactions.quotations.create',
      'transactions.quotations.edit',
      'transactions.purchases',
      'transactions.purchases.create',
      'transactions.purchases.edit',
      'transactions.proforma',
      'transactions.proforma.create',
      'transactions.proforma.edit',
      'stock.view',
      'stock.movements',
      'stock.adjustments',
      'stock.transfers',
      'stock.alerts',
      'stock.reorder',
      'payments.view',
      'payments.received',
      'payments.received.create',
      'payments.paid',
      'payments.paid.create',
      'ledgers.view',
      'ledgers.customers',
      'ledgers.suppliers',
      'reports.view',
      'reports.sales',
      'reports.purchases',
      'reports.stock',
      'reports.gst',
      'reports.profit_loss',
    ],
    isSystem: true,
  },
  {
    id: 'sales',
    name: 'Sales Executive',
    description: 'Can manage customers, sales, and quotations',
    permissions: [
      'dashboard.view',
      'products.view',
      'customers.view',
      'customers.create',
      'customers.edit',
      'transactions.view',
      'transactions.sales',
      'transactions.sales.create',
      'transactions.sales.edit',
      'transactions.sales.print',
      'transactions.quotations',
      'transactions.quotations.create',
      'transactions.quotations.edit',
      'transactions.proforma',
      'transactions.proforma.create',
      'stock.view',
      'payments.view',
      'payments.received',
      'payments.received.create',
      'ledgers.view',
      'ledgers.customers',
      'reports.view',
      'reports.sales',
    ],
    isSystem: true,
  },
  {
    id: 'purchase',
    name: 'Purchase Officer',
    description: 'Can manage suppliers and purchase orders',
    permissions: [
      'dashboard.view',
      'products.view',
      'products.create',
      'products.edit',
      'suppliers.view',
      'suppliers.create',
      'suppliers.edit',
      'transactions.view',
      'transactions.purchases',
      'transactions.purchases.create',
      'transactions.purchases.edit',
      'stock.view',
      'stock.movements',
      'payments.view',
      'payments.paid',
      'payments.paid.create',
      'ledgers.view',
      'ledgers.suppliers',
      'reports.view',
      'reports.purchases',
    ],
    isSystem: true,
  },
  {
    id: 'warehouse',
    name: 'Warehouse Staff',
    description: 'Can manage stock and inventory',
    permissions: [
      'dashboard.view',
      'products.view',
      'stock.view',
      'stock.movements',
      'stock.adjustments',
      'stock.transfers',
      'stock.alerts',
      'stock.reorder',
    ],
    isSystem: true,
  },
  {
    id: 'accountant',
    name: 'Accountant',
    description: 'Can manage payments and view reports',
    permissions: [
      'dashboard.view',
      'products.view',
      'customers.view',
      'suppliers.view',
      'transactions.view',
      'transactions.sales',
      'transactions.purchases',
      'stock.view',
      'payments.view',
      'payments.received',
      'payments.received.create',
      'payments.paid',
      'payments.paid.create',
      'ledgers.view',
      'ledgers.customers',
      'ledgers.suppliers',
      'reports.view',
      'reports.sales',
      'reports.purchases',
      'reports.stock',
      'reports.gst',
      'reports.profit_loss',
    ],
    isSystem: true,
  },
  {
    id: 'viewer',
    name: 'Viewer',
    description: 'Read-only access to view data',
    permissions: [
      'dashboard.view',
      'products.view',
      'customers.view',
      'suppliers.view',
      'transactions.view',
      'stock.view',
      'payments.view',
      'ledgers.view',
      'reports.view',
    ],
    isSystem: true,
  },
];

export const DEFAULT_ROLE = 'viewer';

export const hasPermission = (
  userPermissions: Permission[],
  requiredPermission: Permission
): boolean => {
  if (userPermissions.includes('*' as Permission)) return true;
  return userPermissions.includes(requiredPermission);
};

export const hasAnyPermission = (
  userPermissions: Permission[],
  requiredPermissions: Permission[]
): boolean => {
  if (userPermissions.includes('*' as Permission)) return true;
  return requiredPermissions.some((p) => userPermissions.includes(p));
};

export const hasAllPermissions = (
  userPermissions: Permission[],
  requiredPermissions: Permission[]
): boolean => {
  if (userPermissions.includes('*' as Permission)) return true;
  return requiredPermissions.every((p) => userPermissions.includes(p));
};

export const getRolePermissions = (roleId: string): Permission[] => {
  const role = SYSTEM_ROLES.find((r) => r.id === roleId);
  return role?.permissions ?? [];
};

export default {
  MODULES,
  ACTIONS,
  ALL_PERMISSIONS,
  SYSTEM_ROLES,
  DEFAULT_ROLE,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getRolePermissions,
};
