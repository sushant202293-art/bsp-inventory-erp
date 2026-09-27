import { Permission, Role, UserRole, RolePermission } from './database.types';

export interface PermissionModule {
  module: string;
  actions: PermissionAction[];
}

export interface PermissionAction {
  id: string;
  action: string;
  description: string | null;
  enabled: boolean;
}

export interface RoleWithPermissions extends Role {
  permissions: Permission[];
  user_count?: number;
}

export interface RoleFormData {
  name: string;
  description: string;
  permission_ids: string[];
}

export interface RoleFilters {
  search?: string;
  is_system?: boolean;
}

export interface RoleListResponse {
  roles: RoleWithPermissions[];
  total: number;
}

export interface UserRoleWithRole extends UserRole {
  role: Role;
}

export interface UserWithRoles {
  user_id: string;
  roles: UserRoleWithRole[];
}

export interface UserPermissionCheck {
  module: string;
  action: string;
}

export interface PermissionGroup {
  module: string;
  label: string;
  permissions: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
    approve?: boolean;
  };
}

export const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  products: 'Products',
  categories: 'Categories',
  brands: 'Brands',
  customers: 'Customers',
  suppliers: 'Suppliers',
  sales: 'Sales',
  purchases: 'Purchases',
  quotations: 'Quotations',
  purchase_orders: 'Purchase Orders',
  proforma_invoices: 'Proforma Invoices',
  payments_received: 'Payments Received',
  payments_made: 'Payments Made',
  stock: 'Stock',
  warehouses: 'Warehouses',
  reports: 'Reports',
  settings: 'Settings',
  users: 'Users',
  roles: 'Roles',
  audit_logs: 'Audit Logs',
  backups: 'Backups',
  notifications: 'Notifications',
};

export const ACTION_LABELS: Record<string, string> = {
  create: 'Create',
  read: 'View',
  update: 'Edit',
  delete: 'Delete',
  approve: 'Approve',
  adjust: 'Adjust',
  transfer: 'Transfer',
  sales: 'Sales Reports',
  purchase: 'Purchase Reports',
  stock: 'Stock Reports',
  financial: 'Financial Reports',
};

export const DEFAULT_PERMISSIONS: PermissionGroup[] = [
  {
    module: 'dashboard',
    label: 'Dashboard',
    permissions: { create: false, read: true, update: false, delete: false },
  },
  {
    module: 'products',
    label: 'Products',
    permissions: { create: true, read: true, update: true, delete: true },
  },
  {
    module: 'categories',
    label: 'Categories',
    permissions: { create: true, read: true, update: true, delete: true },
  },
  {
    module: 'brands',
    label: 'Brands',
    permissions: { create: true, read: true, update: true, delete: true },
  },
  {
    module: 'customers',
    label: 'Customers',
    permissions: { create: true, read: true, update: true, delete: true },
  },
  {
    module: 'suppliers',
    label: 'Suppliers',
    permissions: { create: true, read: true, update: true, delete: true },
  },
  {
    module: 'sales',
    label: 'Sales',
    permissions: { create: true, read: true, update: true, delete: true, approve: true },
  },
  {
    module: 'purchases',
    label: 'Purchases',
    permissions: { create: true, read: true, update: true, delete: true, approve: true },
  },
  {
    module: 'quotations',
    label: 'Quotations',
    permissions: { create: true, read: true, update: true, delete: true },
  },
  {
    module: 'purchase_orders',
    label: 'Purchase Orders',
    permissions: { create: true, read: true, update: true, delete: true },
  },
  {
    module: 'proforma_invoices',
    label: 'Proforma Invoices',
    permissions: { create: true, read: true, update: true, delete: true },
  },
  {
    module: 'payments_received',
    label: 'Payments Received',
    permissions: { create: true, read: true, update: true, delete: true },
  },
  {
    module: 'payments_made',
    label: 'Payments Made',
    permissions: { create: true, read: true, update: true, delete: true },
  },
  {
    module: 'stock',
    label: 'Stock',
    permissions: { create: false, read: true, update: false, delete: false, approve: false },
  },
  {
    module: 'warehouses',
    label: 'Warehouses',
    permissions: { create: true, read: true, update: true, delete: true },
  },
  {
    module: 'reports',
    label: 'Reports',
    permissions: { create: false, read: true, update: false, delete: false },
  },
  {
    module: 'settings',
    label: 'Settings',
    permissions: { create: false, read: true, update: true, delete: false },
  },
  {
    module: 'users',
    label: 'Users',
    permissions: { create: true, read: true, update: true, delete: true },
  },
  {
    module: 'roles',
    label: 'Roles',
    permissions: { create: true, read: true, update: true, delete: true },
  },
  {
    module: 'audit_logs',
    label: 'Audit Logs',
    permissions: { create: false, read: true, update: false, delete: false },
  },
  {
    module: 'backups',
    label: 'Backups',
    permissions: { create: true, read: true, update: false, delete: false },
  },
];

export const SYSTEM_ROLES = ['admin', 'manager', 'accountant', 'sales_person', 'viewer'];

export const ROLE_HIERARCHY: Record<string, number> = {
  admin: 100,
  manager: 80,
  accountant: 60,
  sales_person: 40,
  viewer: 20,
};
