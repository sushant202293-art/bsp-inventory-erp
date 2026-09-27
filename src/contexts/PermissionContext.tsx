import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/lib/permissions';
import { getUserPermissions } from '@/lib/permissions';
import type { Permission } from '@/lib/permissions';

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

      const userRole = (profile.role as UserRole) || 'viewer';
      setRole(userRole);

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
          .single();

        if (roleData?.roles) {
          const roleId = Array.isArray(roleData.roles)
            ? (roleData.roles[0] as { id: string })?.id
            : (roleData.roles as unknown as { id: string })?.id;
        if (!roleId) return;

          const { data: rolePerms } = await supabase
            .from('role_permissions')
            .select('permission_id, permissions (id, module, action)')
            .eq('role_id', roleId);

          if (rolePerms && rolePerms.length > 0) {
            const dbPermissions: Permission[] = rolePerms
              .map((rp) => {
                const perm = rp.permissions as unknown as { module: string; action: string } | null;
                if (!perm) return null;
                return `${perm.module}:${perm.action}` as Permission;
              })
              .filter((p): p is Permission => p !== null);

            setPermissions(dbPermissions);
          } else {
            setPermissions(getUserPermissions(userRole));
          }
        } else {
          setPermissions(getUserPermissions(userRole));
        }
      } catch {
        setPermissions(getUserPermissions(userRole));
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
