import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/contexts/PermissionsContext';
import PageHeader from '@/components/admin/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  StaffMember,
  PermissionsMap,
  AdminModule,
  CrudAction,
  ALL_MODULES,
  ALL_CRUD_ACTIONS,
  SUPER_ADMIN_PERMISSIONS,
} from '@/types/permissions';
import { Plus, Pencil, Trash2, Shield, ShieldCheck } from 'lucide-react';

const StaffPage = () => {
  const { isSuperAdmin } = usePermissions();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  // Form state
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState<'super_admin' | 'staff'>('staff');
  const [formPermissions, setFormPermissions] = useState<PermissionsMap>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('staff_members')
      .select('*')
      .order('created_at', { ascending: false }) as { data: any[] | null; error: any };

    if (error) {
      toast.error('Failed to fetch staff members');
    } else {
      setStaff((data || []) as StaffMember[]);
    }
    setLoading(false);
  };

  const openCreateDialog = () => {
    setEditingStaff(null);
    setFormEmail('');
    setFormPassword('');
    setFormName('');
    setFormRole('staff');
    setFormPermissions({});
    setDialogOpen(true);
  };

  const openEditDialog = (member: StaffMember) => {
    setEditingStaff(member);
    setFormEmail(member.email);
    setFormPassword('');
    setFormName(member.name);
    setFormRole(member.role);
    setFormPermissions(member.permissions || {});
    setDialogOpen(true);
  };

  const togglePermission = (module: AdminModule, action: CrudAction) => {
    setFormPermissions((prev) => {
      const current = prev[module] || [];
      const has = current.includes(action);
      const next = has ? current.filter((a) => a !== action) : [...current, action];
      return { ...prev, [module]: next };
    });
  };

  const toggleAllModule = (module: AdminModule) => {
    setFormPermissions((prev) => {
      const current = prev[module] || [];
      const allSelected = ALL_CRUD_ACTIONS.every((a) => current.includes(a));
      return { ...prev, [module]: allSelected ? [] : [...ALL_CRUD_ACTIONS] };
    });
  };

  const toggleFullAccess = () => {
    const hasAll = ALL_MODULES.every(
      (m) => (formPermissions[m.key] || []).length === ALL_CRUD_ACTIONS.length
    );
    setFormPermissions(hasAll ? {} : { ...SUPER_ADMIN_PERMISSIONS });
  };

  const handleSave = async () => {
    if (!formEmail.trim() || !formName.trim()) {
      toast.error('Email and name are required');
      return;
    }
    if (!editingStaff && !formPassword.trim()) {
      toast.error('Password is required for new staff');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-staff', {
        body: {
          action: editingStaff ? 'update' : 'create',
          staffId: editingStaff?.id,
          email: formEmail.trim(),
          password: formPassword.trim() || undefined,
          name: formName.trim(),
          role: formRole,
          permissions: formRole === 'super_admin' ? SUPER_ADMIN_PERMISSIONS : formPermissions,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(editingStaff ? 'Staff updated' : 'Staff created');
      setDialogOpen(false);
      fetchStaff();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save staff member';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (member: StaffMember) => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-staff', {
        body: { action: 'delete', staffId: member.id, userId: member.user_id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success('Staff member deleted');
      fetchStaff();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete';
      toast.error(msg);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Only Super Admins can manage staff.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Staff Management" description="Manage staff accounts and permissions" />

      <div className="flex justify-end">
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Add Staff Member
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Modules</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : staff.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No staff members yet
                  </TableCell>
                </TableRow>
              ) : (
                staff.map((member) => {
                  const moduleCount = Object.keys(member.permissions || {}).filter(
                    (k) => ((member.permissions || {})[k as AdminModule] || []).length > 0
                  ).length;
                  return (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.name}</TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>
                        <Badge variant={member.role === 'super_admin' ? 'default' : 'secondary'}>
                          {member.role === 'super_admin' ? (
                            <><ShieldCheck className="w-3 h-3 mr-1" />Super Admin</>
                          ) : (
                            <><Shield className="w-3 h-3 mr-1" />Staff</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={member.is_active ? 'default' : 'destructive'}>
                          {member.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>{member.role === 'super_admin' ? 'All' : `${moduleCount} modules`}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(member)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Staff Member</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently remove {member.name} and their auth account.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(member)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Staff name" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="staff@example.com"
                  disabled={!!editingStaff}
                />
              </div>
            </div>

            {!editingStaff && (
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="Min 6 characters"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Role</Label>
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant={formRole === 'super_admin' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFormRole('super_admin')}
                >
                  <ShieldCheck className="w-4 h-4 mr-1" />
                  Super Admin
                </Button>
                <Button
                  type="button"
                  variant={formRole === 'staff' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFormRole('staff')}
                >
                  <Shield className="w-4 h-4 mr-1" />
                  Staff
                </Button>
              </div>
            </div>

            {formRole === 'staff' && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Module Permissions</CardTitle>
                    <Button type="button" variant="outline" size="sm" onClick={toggleFullAccess}>
                      Toggle Full Access
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Module</TableHead>
                        <TableHead className="text-center">All</TableHead>
                        {ALL_CRUD_ACTIONS.map((action) => (
                          <TableHead key={action} className="text-center capitalize">
                            {action}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ALL_MODULES.map((mod) => {
                        const modPerms = formPermissions[mod.key] || [];
                        const allChecked = ALL_CRUD_ACTIONS.every((a) => modPerms.includes(a));
                        return (
                          <TableRow key={mod.key}>
                            <TableCell className="font-medium">{mod.label}</TableCell>
                            <TableCell className="text-center">
                              <Checkbox
                                checked={allChecked}
                                onCheckedChange={() => toggleAllModule(mod.key)}
                              />
                            </TableCell>
                            {ALL_CRUD_ACTIONS.map((action) => (
                              <TableCell key={action} className="text-center">
                                <Checkbox
                                  checked={modPerms.includes(action)}
                                  onCheckedChange={() => togglePermission(mod.key, action)}
                                />
                              </TableCell>
                            ))}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editingStaff ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffPage;
