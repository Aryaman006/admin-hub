import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  AdminModule,
  CrudAction,
  PermissionsMap,
  StaffRole,
  SUPER_ADMIN_PERMISSIONS,
} from '@/types/permissions';

interface PermissionsContextType {
  role: StaffRole | null;
  permissions: PermissionsMap;
  isSuperAdmin: boolean;
  isLoading: boolean;
  hasPermission: (module: AdminModule, action: CrudAction) => boolean;
  canRead: (module: AdminModule) => boolean;
  canCreate: (module: AdminModule) => boolean;
  canUpdate: (module: AdminModule) => boolean;
  canDelete: (module: AdminModule) => boolean;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (!context) {
    // Fallback for when used outside provider (e.g., during initial render)
    return {
      role: 'super_admin' as StaffRole,
      permissions: SUPER_ADMIN_PERMISSIONS,
      isSuperAdmin: true,
      isLoading: true,
      hasPermission: () => true,
      canRead: () => true,
      canCreate: () => true,
      canUpdate: () => true,
      canDelete: () => true,
    } as PermissionsContextType;
  }
  return context;
};

export const PermissionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin } = useAuth();
  const [role, setRole] = useState<StaffRole | null>(null);
  const [permissions, setPermissions] = useState<PermissionsMap>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !isAdmin) {
      setRole(null);
      setPermissions({});
      setIsLoading(false);
      return;
    }

    const fetchPermissions = async () => {
      try {
        // Check if user is in staff_members table
        const { data: staffData, error } = await supabase
          .from('staff_members')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle() as { data: any; error: any };

        if (error) {
          console.error('Error fetching staff data:', error);
          // Fallback: if in admins table but not staff_members, treat as super_admin
          setRole('super_admin');
          setPermissions(SUPER_ADMIN_PERMISSIONS);
          setIsLoading(false);
          return;
        }

        if (staffData) {
          setRole(staffData.role as StaffRole);
          if (staffData.role === 'super_admin') {
            setPermissions(SUPER_ADMIN_PERMISSIONS);
          } else {
            setPermissions((staffData.permissions as PermissionsMap) || {});
          }
        } else {
          // User is in admins table but not staff_members — treat as super_admin (backward compat)
          setRole('super_admin');
          setPermissions(SUPER_ADMIN_PERMISSIONS);
        }
      } catch (err) {
        console.error('Error in fetchPermissions:', err);
        setRole('super_admin');
        setPermissions(SUPER_ADMIN_PERMISSIONS);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPermissions();
  }, [user, isAdmin]);

  const isSuperAdmin = role === 'super_admin';

  const hasPermission = (module: AdminModule, action: CrudAction): boolean => {
    if (isSuperAdmin) return true;
    return permissions[module]?.includes(action) ?? false;
  };

  const canRead = (module: AdminModule) => hasPermission(module, 'read');
  const canCreate = (module: AdminModule) => hasPermission(module, 'create');
  const canUpdate = (module: AdminModule) => hasPermission(module, 'update');
  const canDelete = (module: AdminModule) => hasPermission(module, 'delete');

  return (
    <PermissionsContext.Provider
      value={{ role, permissions, isSuperAdmin, isLoading, hasPermission, canRead, canCreate, canUpdate, canDelete }}
    >
      {children}
    </PermissionsContext.Provider>
  );
};
