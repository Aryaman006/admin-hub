import { ReactNode } from 'react';
import { usePermissions } from '@/contexts/PermissionsContext';
import { AdminModule } from '@/types/permissions';

interface ProtectedRouteProps {
  module: AdminModule;
  children: ReactNode;
}

/**
 * Route-level guard: if the user cannot read the module, show access denied.
 */
const ProtectedRoute = ({ module, children }: ProtectedRouteProps) => {
  const { canRead, isLoading, isSuperAdmin } = usePermissions();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isSuperAdmin && !canRead(module)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <p className="text-lg font-semibold text-muted-foreground">Access Denied</p>
          <p className="text-sm text-muted-foreground">You don't have permission to view this section.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
