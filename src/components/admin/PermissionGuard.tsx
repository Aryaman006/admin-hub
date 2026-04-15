import { ReactNode } from 'react';
import { usePermissions } from '@/contexts/PermissionsContext';
import { AdminModule, CrudAction } from '@/types/permissions';

interface PermissionGuardProps {
  module: AdminModule;
  action: CrudAction;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Conditionally renders children based on the current user's permissions.
 * Use this to hide/show buttons, sections, etc.
 */
const PermissionGuard = ({ module, action, children, fallback = null }: PermissionGuardProps) => {
  const { hasPermission } = usePermissions();

  if (!hasPermission(module, action)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default PermissionGuard;
