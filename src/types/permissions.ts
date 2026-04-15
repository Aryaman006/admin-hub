// Module keys matching admin sidebar sections
export type AdminModule =
  | 'dashboard'
  | 'users'
  | 'categories'
  | 'corporates'
  | 'videos'
  | 'live_classes'
  | 'payments'
  | 'analytics'
  | 'courses_blog'
  | 'media_events'
  | 'blogs'
  | 'withdrawals'
  | 'staff';

export type CrudAction = 'create' | 'read' | 'update' | 'delete';

// Permission map: module -> array of allowed actions
export type PermissionsMap = Partial<Record<AdminModule, CrudAction[]>>;

export type StaffRole = 'super_admin' | 'staff';

export interface StaffMember {
  id: string;
  user_id: string;
  email: string;
  name: string;
  role: StaffRole;
  permissions: PermissionsMap;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const ALL_MODULES: { key: AdminModule; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'users', label: 'Users' },
  { key: 'categories', label: 'Categories' },
  { key: 'corporates', label: 'Corporates' },
  { key: 'videos', label: 'Videos' },
  { key: 'live_classes', label: 'Live Classes' },
  { key: 'payments', label: 'Payments' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'courses_blog', label: 'Courses Blog' },
  { key: 'media_events', label: 'Media & Events' },
  { key: 'blogs', label: 'Blogs' },
  { key: 'withdrawals', label: 'Withdrawals' },
  { key: 'staff', label: 'Staff Management' },
];

export const ALL_CRUD_ACTIONS: CrudAction[] = ['create', 'read', 'update', 'delete'];

// Full permissions for super admin
export const SUPER_ADMIN_PERMISSIONS: PermissionsMap = ALL_MODULES.reduce(
  (acc, m) => ({ ...acc, [m.key]: [...ALL_CRUD_ACTIONS] }),
  {} as PermissionsMap
);
