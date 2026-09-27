// ==========================================
// Role-Based Access Control (RBAC)
// ==========================================

export type UserRole = "owner" | "admin" | "manager" | "accountant" | "viewer";

export type Permission =
  | "business:read"
  | "business:write"
  | "business:delete"
  | "users:read"
  | "users:write"
  | "users:delete"
  | "users:manage"
  | "products:read"
  | "products:write"
  | "products:delete"
  | "products:import"
  | "products:export"
  | "categories:read"
  | "categories:write"
  | "categories:delete"
  | "customers:read"
  | "customers:write"
  | "customers:delete"
  | "customers:export"
  | "suppliers:read"
  | "suppliers:write"
  | "suppliers:delete"
  | "suppliers:export"
  | "invoices:read"
  | "invoices:write"
  | "invoices:delete"
  | "invoices:approve"
  | "invoices:export"
  | "payments:read"
  | "payments:write"
  | "payments:delete"
  | "payments:approve"
  | "payments:export"
  | "reports:read"
  | "reports:export"
  | "reports:gst"
  | "reports:inventory"
  | "reports:financial"
  | "reports:sales"
  | "reports:purchase"
  | "settings:read"
  | "settings:write"
  | "dashboard:read"
  | "dashboard:analytics"
  | "stock:read"
  | "stock:write"
  | "stock:adjust"
  | "stock:import"
  | "stock:export";

// ==========================================
// Role Permissions Mapping
// ==========================================

const rolePermissions: Record<UserRole, Permission[]> = {
  owner: [
    "business:read",
    "business:write",
    "business:delete",
    "users:read",
    "users:write",
    "users:delete",
    "users:manage",
    "products:read",
    "products:write",
    "products:delete",
    "products:import",
    "products:export",
    "categories:read",
    "categories:write",
    "categories:delete",
    "customers:read",
    "customers:write",
    "customers:delete",
    "customers:export",
    "suppliers:read",
    "suppliers:write",
    "suppliers:delete",
    "suppliers:export",
    "invoices:read",
    "invoices:write",
    "invoices:delete",
    "invoices:approve",
    "invoices:export",
    "payments:read",
    "payments:write",
    "payments:delete",
    "payments:approve",
    "payments:export",
    "reports:read",
    "reports:export",
    "reports:gst",
    "reports:inventory",
    "reports:financial",
    "reports:sales",
    "reports:purchase",
    "settings:read",
    "settings:write",
    "dashboard:read",
    "dashboard:analytics",
    "stock:read",
    "stock:write",
    "stock:adjust",
    "stock:import",
    "stock:export",
  ],
  admin: [
    "business:read",
    "business:write",
    "users:read",
    "users:write",
    "users:manage",
    "products:read",
    "products:write",
    "products:delete",
    "products:import",
    "products:export",
    "categories:read",
    "categories:write",
    "categories:delete",
    "customers:read",
    "customers:write",
    "customers:delete",
    "customers:export",
    "suppliers:read",
    "suppliers:write",
    "suppliers:delete",
    "suppliers:export",
    "invoices:read",
    "invoices:write",
    "invoices:delete",
    "invoices:approve",
    "invoices:export",
    "payments:read",
    "payments:write",
    "payments:delete",
    "payments:approve",
    "payments:export",
    "reports:read",
    "reports:export",
    "reports:gst",
    "reports:inventory",
    "reports:financial",
    "reports:sales",
    "reports:purchase",
    "settings:read",
    "settings:write",
    "dashboard:read",
    "dashboard:analytics",
    "stock:read",
    "stock:write",
    "stock:adjust",
    "stock:import",
    "stock:export",
  ],
  manager: [
    "business:read",
    "users:read",
    "products:read",
    "products:write",
    "products:import",
    "products:export",
    "categories:read",
    "categories:write",
    "customers:read",
    "customers:write",
    "customers:export",
    "suppliers:read",
    "suppliers:write",
    "suppliers:export",
    "invoices:read",
    "invoices:write",
    "invoices:export",
    "payments:read",
    "payments:write",
    "payments:export",
    "reports:read",
    "reports:export",
    "reports:gst",
    "reports:inventory",
    "reports:sales",
    "reports:purchase",
    "settings:read",
    "dashboard:read",
    "dashboard:analytics",
    "stock:read",
    "stock:write",
    "stock:adjust",
    "stock:import",
    "stock:export",
  ],
  accountant: [
    "business:read",
    "users:read",
    "products:read",
    "categories:read",
    "customers:read",
    "customers:write",
    "customers:export",
    "suppliers:read",
    "suppliers:write",
    "suppliers:export",
    "invoices:read",
    "invoices:write",
    "invoices:export",
    "payments:read",
    "payments:write",
    "payments:approve",
    "payments:export",
    "reports:read",
    "reports:export",
    "reports:gst",
    "reports:financial",
    "settings:read",
    "dashboard:read",
    "stock:read",
  ],
  viewer: [
    "business:read",
    "users:read",
    "products:read",
    "categories:read",
    "customers:read",
    "suppliers:read",
    "invoices:read",
    "payments:read",
    "reports:read",
    "settings:read",
    "dashboard:read",
    "stock:read",
  ],
};

// ==========================================
// Permission Checking Functions
// ==========================================

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = rolePermissions[role] || [];
  return permissions.includes(permission);
}

/**
 * Check if a role has all specified permissions
 */
export function hasAllPermissions(
  role: UserRole,
  permissions: Permission[]
): boolean {
  return permissions.every((permission) => hasPermission(role, permission));
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(
  role: UserRole,
  permissions: Permission[]
): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return rolePermissions[role] || [];
}

/**
 * Get all permissions for a user (can be overridden per user)
 */
export function getUserPermissions(
  role: UserRole,
  customPermissions?: Permission[]
): Permission[] {
  const basePermissions = rolePermissions[role] || [];

  if (customPermissions && customPermissions.length > 0) {
    return [...new Set([...basePermissions, ...customPermissions])];
  }

  return basePermissions;
}

/**
 * Check if user can access a module
 */
export function canAccessModule(
  role: UserRole,
  module:
    | "business"
    | "users"
    | "products"
    | "categories"
    | "customers"
    | "suppliers"
    | "invoices"
    | "payments"
    | "reports"
    | "settings"
    | "dashboard"
    | "stock"
): boolean {
  const readPermission = `${module}:read` as Permission;
  return hasPermission(role, readPermission);
}

/**
 * Check if user can perform action on module
 */
export function canPerformAction(
  role: UserRole,
  module:
    | "business"
    | "users"
    | "products"
    | "categories"
    | "customers"
    | "suppliers"
    | "invoices"
    | "payments"
    | "reports"
    | "settings"
    | "dashboard"
    | "stock",
  action: "read" | "write" | "delete" | "approve" | "export" | "import" | "adjust" | "manage" | "analytics"
): boolean {
  const permission = `${module}:${action}` as Permission;
  return hasPermission(role, permission);
}

// ==========================================
// Route Guards
// ==========================================

export type Route =
  | "/dashboard"
  | "/products"
  | "/products/:id"
  | "/products/new"
  | "/products/:id/edit"
  | "/categories"
  | "/customers"
  | "/customers/:id"
  | "/customers/new"
  | "/customers/:id/edit"
  | "/suppliers"
  | "/suppliers/:id"
  | "/suppliers/new"
  | "/suppliers/:id/edit"
  | "/invoices"
  | "/invoices/:id"
  | "/invoices/new"
  | "/invoices/:id/edit"
  | "/payments"
  | "/payments/:id"
  | "/payments/new"
  | "/reports"
  | "/reports/sales"
  | "/reports/purchase"
  | "/reports/gst"
  | "/reports/inventory"
  | "/reports/financial"
  | "/settings"
  | "/settings/business"
  | "/settings/users"
  | "/settings/invoice"
  | "/settings/payment";

const routePermissions: Record<string, Permission> = {
  "/dashboard": "dashboard:read",
  "/products": "products:read",
  "/products/new": "products:write",
  "/categories": "categories:read",
  "/customers": "customers:read",
  "/customers/new": "customers:write",
  "/suppliers": "suppliers:read",
  "/suppliers/new": "suppliers:write",
  "/invoices": "invoices:read",
  "/invoices/new": "invoices:write",
  "/payments": "payments:read",
  "/payments/new": "payments:write",
  "/reports": "reports:read",
  "/reports/sales": "reports:sales",
  "/reports/purchase": "reports:purchase",
  "/reports/gst": "reports:gst",
  "/reports/inventory": "reports:inventory",
  "/reports/financial": "reports:financial",
  "/settings": "settings:read",
  "/settings/business": "settings:write",
  "/settings/users": "users:manage",
  "/settings/invoice": "settings:write",
  "/settings/payment": "settings:write",
};

/**
 * Check if user can access a route
 */
export function canAccessRoute(role: UserRole, route: string): boolean {
  const permission = routePermissions[route];
  if (!permission) return true; // Allow access to unknown routes
  return hasPermission(role, permission);
}

// ==========================================
// UI Element Visibility
// ==========================================

/**
 * Check if user can see a UI element
 */
export function canSeeElement(
  role: UserRole,
  element:
    | "create_button"
    | "edit_button"
    | "delete_button"
    | "export_button"
    | "import_button"
    | "approve_button"
    | "settings_link"
    | "user_management"
    | "reports_link"
    | "stock_adjustment"
): boolean {
  const elementPermissions: Record<string, Permission[]> = {
    create_button: [
      "products:write",
      "customers:write",
      "suppliers:write",
      "invoices:write",
      "payments:write",
    ],
    edit_button: [
      "products:write",
      "customers:write",
      "suppliers:write",
      "invoices:write",
      "payments:write",
    ],
    delete_button: [
      "products:delete",
      "customers:delete",
      "suppliers:delete",
      "invoices:delete",
      "payments:delete",
    ],
    export_button: [
      "products:export",
      "customers:export",
      "suppliers:export",
      "invoices:export",
      "payments:export",
      "reports:export",
    ],
    import_button: ["products:import", "stock:import"],
    approve_button: ["invoices:approve", "payments:approve"],
    settings_link: ["settings:write"],
    user_management: ["users:manage"],
    reports_link: ["reports:read"],
    stock_adjustment: ["stock:adjust"],
  };

  const permissions = elementPermissions[element] || [];
  return hasAnyPermission(role, permissions);
}

// ==========================================
// Role Hierarchy
// ==========================================

const roleHierarchy: Record<UserRole, number> = {
  owner: 5,
  admin: 4,
  manager: 3,
  accountant: 2,
  viewer: 1,
};

/**
 * Check if user's role is higher than or equal to required role
 */
export function hasMinimumRole(
  userRole: UserRole,
  requiredRole: UserRole
): boolean {
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Check if user can manage another user
 */
export function canManageUser(
  managerRole: UserRole,
  targetUserRole: UserRole
): boolean {
  // Owner can manage everyone
  if (managerRole === "owner") return true;

  // Admin can manage manager, accountant, viewer
  if (managerRole === "admin") {
    return roleHierarchy[targetUserRole] < roleHierarchy["admin"];
  }

  // Manager can manage accountant, viewer
  if (managerRole === "manager") {
    return roleHierarchy[targetUserRole] < roleHierarchy["manager"];
  }

  return false;
}

// ==========================================
// Data Access Control
// ==========================================

/**
 * Check if user can view all data or only own data
 */
export function canViewAllData(role: UserRole): boolean {
  return ["owner", "admin", "manager"].includes(role);
}

/**
 * Check if user can approve transactions
 */
export function canApproveTransactions(role: UserRole): boolean {
  return hasAnyPermission(role, ["invoices:approve", "payments:approve"]);
}

/**
 * Check if user can access financial reports
 */
export function canAccessFinancialReports(role: UserRole): boolean {
  return hasPermission(role, "reports:financial");
}

/**
 * Check if user can access GST reports
 */
export function canAccessGSTReports(role: UserRole): boolean {
  return hasPermission(role, "reports:gst");
}

/**
 * Check if user can modify business settings
 */
export function canModifyBusinessSettings(role: UserRole): boolean {
  return hasPermission(role, "settings:write");
}

/**
 * Check if user can manage users
 */
export function canManageUsers(role: UserRole): boolean {
  return hasPermission(role, "users:manage");
}

// ==========================================
// Permission Groups
// ==========================================

export const permissionGroups = {
  "Business Management": [
    "business:read",
    "business:write",
    "business:delete",
  ] as Permission[],
  "User Management": [
    "users:read",
    "users:write",
    "users:delete",
    "users:manage",
  ] as Permission[],
  "Product Management": [
    "products:read",
    "products:write",
    "products:delete",
    "products:import",
    "products:export",
  ] as Permission[],
  "Category Management": [
    "categories:read",
    "categories:write",
    "categories:delete",
  ] as Permission[],
  "Customer Management": [
    "customers:read",
    "customers:write",
    "customers:delete",
    "customers:export",
  ] as Permission[],
  "Supplier Management": [
    "suppliers:read",
    "suppliers:write",
    "suppliers:delete",
    "suppliers:export",
  ] as Permission[],
  "Invoice Management": [
    "invoices:read",
    "invoices:write",
    "invoices:delete",
    "invoices:approve",
    "invoices:export",
  ] as Permission[],
  "Payment Management": [
    "payments:read",
    "payments:write",
    "payments:delete",
    "payments:approve",
    "payments:export",
  ] as Permission[],
  "Reports": [
    "reports:read",
    "reports:export",
    "reports:gst",
    "reports:inventory",
    "reports:financial",
    "reports:sales",
    "reports:purchase",
  ] as Permission[],
  "Settings": ["settings:read", "settings:write"] as Permission[],
  "Dashboard": [
    "dashboard:read",
    "dashboard:analytics",
  ] as Permission[],
  "Stock Management": [
    "stock:read",
    "stock:write",
    "stock:adjust",
    "stock:import",
    "stock:export",
  ] as Permission[],
};

/**
 * Get permission groups for a role
 */
export function getPermissionGroupsForRole(
  role: UserRole
): Record<string, { permission: Permission; granted: boolean }[]> {
  const permissions = rolePermissions[role] || [];

  return Object.entries(permissionGroups).reduce(
    (groups, [groupName, groupPermissions]) => ({
      ...groups,
      [groupName]: groupPermissions.map((permission) => ({
        permission,
        granted: permissions.includes(permission),
      })),
    }),
    {} as Record<string, { permission: Permission; granted: boolean }[]>
  );
}

// ==========================================
// Default Settings per Role
// ==========================================

export const defaultRoleSettings: Record<
  UserRole,
  {
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canApprove: boolean;
    canExport: boolean;
    canImport: boolean;
    canViewReports: boolean;
    canManageUsers: boolean;
    canChangeSettings: boolean;
  }
> = {
  owner: {
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canApprove: true,
    canExport: true,
    canImport: true,
    canViewReports: true,
    canManageUsers: true,
    canChangeSettings: true,
  },
  admin: {
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canApprove: true,
    canExport: true,
    canImport: true,
    canViewReports: true,
    canManageUsers: true,
    canChangeSettings: true,
  },
  manager: {
    canCreate: true,
    canEdit: true,
    canDelete: false,
    canApprove: false,
    canExport: true,
    canImport: true,
    canViewReports: true,
    canManageUsers: false,
    canChangeSettings: false,
  },
  accountant: {
    canCreate: true,
    canEdit: true,
    canDelete: false,
    canApprove: true,
    canExport: true,
    canImport: false,
    canViewReports: true,
    canManageUsers: false,
    canChangeSettings: false,
  },
  viewer: {
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canApprove: false,
    canExport: false,
    canImport: false,
    canViewReports: false,
    canManageUsers: false,
    canChangeSettings: false,
  },
};

export default {
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  getRolePermissions,
  getUserPermissions,
  canAccessModule,
  canPerformAction,
  canAccessRoute,
  canSeeElement,
  hasMinimumRole,
  canManageUser,
  canViewAllData,
  canApproveTransactions,
  canAccessFinancialReports,
  canAccessGSTReports,
  canModifyBusinessSettings,
  canManageUsers,
  getPermissionGroupsForRole,
  permissionGroups,
  defaultRoleSettings,
};
