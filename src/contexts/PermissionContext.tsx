import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/lib/permissions';
import { getUserPermissions, normalizeRole } from '@/lib/permissions';
import type { Permission } from '@/lib/permissions';
import { resolvePermissions } from '@/lib/permission-mapping';
import type { DbPermissionRow } from '@/lib/permission-mapping';

interface PermissionState {
  permissions: Permission[];
  role: UserRole | null;
  loading: boolean;
}

interface PermissionContextValue extends PermissionState {
  hasPermission: (permission: Permission) => boolean;
  canAccess: (module: string) => boolean;
  canCreate: (module: string) => boolean;
  canEdit: (module: string) => boolean;
  canDelete: (module: string) => boolean;
  canView: (module: string) => boolean;
  canApprove: (module: string) => boolean;
  canPrint: (module: string) => boolean;
  canExport: (module: string) => boolean;
  canImport: (module: string) => boolean;
}

const PermissionContext = createContext<PermissionContextValue | undefined>(undefined);

export function PermissionProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPermissions() {
      if (!profile) {
        setPermissions([]);
        setRole(null);
        setLoading(false);
        return;
      }

      // `profiles.role` is free text and the admin UI has offered several
      // different labels over time, so it is normalised rather than cast.
      // `normalizeRole` falls back to `viewer` for anything unrecognised, so an
      // unknown label can never widen access.
      const userRole = normalizeRole(profile.role);
      setRole(userRole);

      // The static matrix for this role is always the baseline; database rows
      // are added on top by `resolvePermissions`. The `permissions` table uses a
      // different vocabulary (create/update rather than write, `backups` rather
      // than `backup`) and is missing modules such as `units` and `ledgers`
      // entirely, so on its own it silently denied every create/edit/export.
      const baseline = getUserPermissions(userRole);

      try {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select(`
            role_id,
            roles (
              id,
              name
            )
          `)
          .eq('user_id', profile.id)
          .limit(1)
          // `maybeSingle()`, not `single()`: a profile with no `user_roles` row
          // makes `single()` throw PGRST116 (HTTP 406), which previously killed
          // the lookup and silently dropped the user back to no permissions.
          .maybeSingle();

        const roleId = roleData?.roles
          ? Array.isArray(roleData.roles)
            ? (roleData.roles[0] as { id: string })?.id
            : (roleData.roles as unknown as { id: string })?.id
          : undefined;

        // Only trust the database grants while they still describe the role the
        // profile actually has. `user_roles` is a bridge row created once (see
        // migration 008) and the admin UI edits `profiles.role` without touching
        // it, so after a downgrade the bridge can still name the old, more
        // privileged role. Comparing the two means the profile's current role
        // always wins and the bridge self-heals without needing write access to
        // `user_roles`.
        const bridgedName = roleData?.roles
          ? Array.isArray(roleData.roles)
            ? (roleData.roles[0] as { name: string })?.name
            : (roleData.roles as unknown as { name: string })?.name
          : undefined;

        const bridgeMatches =
          !!roleId &&
          !!bridgedName &&
          normalizeRole(bridgedName) === userRole;

        // A profile whose `role` has no matching row in `roles` (the UI can set
        // `sales`, `purchase`, `accounts`, `inventory` or `super_admin`, but the
        // seeded roles table only contains admin/manager/accountant/viewer) has
        // no `user_roles` bridge. That is expected, not an error: the baseline
        // already covers it.
        if (!bridgeMatches) {
          setPermissions(baseline);
          return;
        }

        const { data: rolePerms } = await supabase
          .from('role_permissions')
          .select('permission_id, permissions (id, module, action)')
          .eq('role_id', roleId as string);

        const rows = (rolePerms ?? [])
          .map((rp) => {
            const perm = Array.isArray(rp.permissions)
              ? (rp.permissions[0] as { module: string; action: string } | null)
              : (rp.permissions as unknown as { module: string; action: string } | null);
            return perm ? { module: perm.module, action: perm.action } : null;
          })
          .filter((r): r is DbPermissionRow => r !== null);

        setPermissions(resolvePermissions(rows, baseline));
      } catch {
        setPermissions(baseline);
      } finally {
        setLoading(false);
      }
    }

    fetchPermissions();
  }, [profile]);

  const hasPermission = useCallback((permission: Permission): boolean => {
    return permissions.includes(permission);
  }, [permissions]);

  const canAccess = useCallback((module: string): boolean => {
    return hasPermission(`${module}:read` as Permission);
  }, [hasPermission]);

  const canCreate = useCallback((module: string): boolean => {
    return hasPermission(`${module}:write` as Permission);
  }, [hasPermission]);

  const canEdit = useCallback((module: string): boolean => {
    return hasPermission(`${module}:write` as Permission);
  }, [hasPermission]);

  const canDelete = useCallback((module: string): boolean => {
    return hasPermission(`${module}:delete` as Permission);
  }, [hasPermission]);

  const canView = useCallback((module: string): boolean => {
    return hasPermission(`${module}:read` as Permission);
  }, [hasPermission]);

  const canApprove = useCallback((module: string): boolean => {
    return hasPermission(`${module}:approve` as Permission);
  }, [hasPermission]);

  const canPrint = useCallback((_module: string): boolean => {
    return role !== 'viewer';
  }, [role]);

  const canExport = useCallback((module: string): boolean => {
    return hasPermission(`${module}:export` as Permission);
  }, [hasPermission]);

  const canImport = useCallback((module: string): boolean => {
    return hasPermission(`${module}:import` as Permission);
  }, [hasPermission]);

  const value = useMemo<PermissionContextValue>(() => ({
    permissions,
    role,
    loading,
    hasPermission,
    canAccess,
    canCreate,
    canEdit,
    canDelete,
    canView,
    canApprove,
    canPrint,
    canExport,
    canImport,
  }), [permissions, role, loading, hasPermission, canAccess, canCreate, canEdit, canDelete, canView, canApprove, canPrint, canExport, canImport]);

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

export function usePermissions(): PermissionContextValue {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
}

export { PermissionContext };
