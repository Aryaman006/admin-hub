import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PermissionGuard from '@/components/admin/PermissionGuard';
import { supabase } from '@/integrations/supabase/client';
import PageHeader from '@/components/admin/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus, Trash2, Building2, Users, Eye, Search, Ticket, Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { exportCorporatesData } from '@/utils/excelExport';

interface Corporate {
  id: string;
  name: string;
  coupon_code: string | null;
  is_active: boolean;
  created_at: string;
  member_count?: number;
  admin_email?: string;
}

interface CorporateMember {
  id: string;
  corporate_id: string;
  email: string;
  created_at: string;
}

const fetchCorporates = async (): Promise<Corporate[]> => {
  // Use direct Supabase queries with service-role-free approach
  const { data, error } = await (supabase.from('corporates') as any)
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching corporates:', error);
    // If RLS blocks, try the edge function as fallback
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke('manage-corporates', {
        body: { action: 'list' },
      });
      if (!fnError && fnData && !fnData.error) return fnData;
    } catch {}
    return [];
  }

  const corps: Corporate[] = (data || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    coupon_code: c.coupon_code,
    admin_email: c.admin_email || '—',
    is_active: c.is_active,
    created_at: c.created_at,
    member_count: 0,
  }));

  if (corps.length === 0) return corps;

  const ids = corps.map(c => c.id);
  const { data: memberData } = await (supabase.from('corporate_members') as any)
    .select('corporate_id')
    .in('corporate_id', ids);
  const memberCounts: Record<string, number> = {};
  (memberData || []).forEach((m: any) => {
    memberCounts[m.corporate_id] = (memberCounts[m.corporate_id] || 0) + 1;
  });
  corps.forEach(c => { c.member_count = memberCounts[c.id] || 0; });

  return corps;
};

const fetchMembers = async (corpId: string): Promise<CorporateMember[]> => {
  const { data, error } = await (supabase.from('corporate_members') as any)
    .select('*')
    .eq('corporate_id', corpId)
    .order('created_at', { ascending: false });
  if (error) {
    // Fallback to edge function
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke('manage-corporates', {
        body: { action: 'get_members', corporate_id: corpId },
      });
      if (!fnError && fnData && !fnData.error) return fnData;
    } catch {}
    return [];
  }
  return data || [];
};

const CorporatesPage = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Corporate | null>(null);
  const [viewingCorp, setViewingCorp] = useState<Corporate | null>(null);

  const [formData, setFormData] = useState({ name: '', coupon_code: '', admin_email: '', admin_password: '' });

  const { data: corporates = [], isLoading } = useQuery({
    queryKey: ['corporates'],
    queryFn: fetchCorporates,
  });

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ['corporate-members', viewingCorp?.id],
    queryFn: () => fetchMembers(viewingCorp!.id),
    enabled: !!viewingCorp,
  });

  // Use edge function for creation to avoid session swap and RLS issues
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!data.name.trim()) throw new Error('Corporate name is required');
      if (!data.admin_email.trim()) throw new Error('Admin email is required');
      if (!data.admin_password || data.admin_password.length < 6) throw new Error('Password must be at least 6 characters');

      // Check locally first
      const existingCorporate = corporates.find(
        (corp) => corp.admin_email?.toLowerCase() === data.admin_email.trim().toLowerCase()
      );
      if (existingCorporate) {
        toast.info('This admin email already exists. A corporate with this email is already registered.');
        return { existing: true };
      }

      const { data: result, error } = await supabase.functions.invoke('create-corporate-user', {
        body: {
          name: data.name.trim(),
          coupon_code: data.coupon_code.trim() || null,
          email: data.admin_email.trim().toLowerCase(),
          password: data.admin_password,
        },
      });

      if (error) {
        const msg = (error as any)?.message || '';
        if (msg.includes('already exists') || msg.includes('already been registered')) {
          toast.info('This admin email already exists. A corporate with this email is already registered.');
          return { existing: true };
        }
        throw error;
      }
      if (result?.error) {
        if (result.error.includes('already exists') || result.error.includes('already been registered')) {
          toast.info('This admin email already exists. A corporate with this email is already registered.');
          return { existing: true };
        }
        throw new Error(result.error);
      }

      return result;
    },
    onSuccess: (result) => {
      if (!result?.existing) {
        toast.success('Corporate created successfully');
      }
      setIsFormOpen(false);
      setFormData({ name: '', coupon_code: '', admin_email: '', admin_password: '' });
      queryClient.invalidateQueries({ queryKey: ['corporates'] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to create corporate'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (corpId: string) => {
      // Try direct delete with proper cascade order
      await (supabase.from('subscriptions') as any).delete().eq('corporate_id', corpId);
      await (supabase.from('corporate_members') as any).delete().eq('corporate_id', corpId);
      await (supabase.from('corporate_admins') as any).delete().eq('corporate_id', corpId);
      const { error } = await (supabase.from('corporates') as any).delete().eq('id', corpId);
      if (error) {
        // Fallback to edge function
        const { data, error: fnError } = await supabase.functions.invoke('manage-corporates', {
          body: { action: 'delete', corporate_id: corpId },
        });
        if (fnError) throw fnError;
        if (data?.error) throw new Error(data.error);
      }
    },
    onSuccess: () => {
      toast.success('Corporate deleted');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['corporates'] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to delete'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase.from('corporates') as any)
        .update({ is_active })
        .eq('id', id);
      if (error) {
        // Fallback to edge function
        const { data, error: fnError } = await supabase.functions.invoke('manage-corporates', {
          body: { action: 'toggle_active', corporate_id: id, is_active },
        });
        if (fnError) throw fnError;
        if (data?.error) throw new Error(data.error);
      }
    },
    onSuccess: (_, vars) => {
      toast.success(`Corporate ${vars.is_active ? 'activated' : 'deactivated'}`);
      queryClient.invalidateQueries({ queryKey: ['corporates'] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update status'),
  });

  const handleExportCorporates = async () => {
    setIsExporting(true);
    try {
      if (corporates.length === 0) {
        toast.error("No corporates to export");
        return;
      }

      exportCorporatesData(corporates);
      toast.success(`Exported ${corporates.length} corporates successfully`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to export corporates";
      toast.error(errorMessage);
    } finally {
      setIsExporting(false);
    }
  };

  const filtered = corporates.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.coupon_code || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
       <PageHeader 
        title="Corporates" 
        description="Manage corporate accounts, admins, and members"
      >
        <PermissionGuard module="corporates" action="read">
          <Button 
            onClick={handleExportCorporates}
            disabled={isExporting || corporates.length === 0}
            variant="outline"
            className="mr-2"
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? "Exporting..." : "Export Corporates"}
          </Button>
        </PermissionGuard>
        <PermissionGuard module="corporates" action="create">
          <Button onClick={() => { setFormData({ name: '', coupon_code: '', admin_email: '', admin_password: '' }); setIsFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Create Corporate
          </Button>
        </PermissionGuard>
      </PageHeader>

      <div className="mb-6">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search corporates..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Corporate Name</TableHead>
                  <TableHead>Coupon Code</TableHead>
                  <TableHead>Admin Email</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No corporates found</TableCell>
                  </TableRow>
                ) : filtered.map(corp => (
                  <TableRow key={corp.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        {corp.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      {corp.coupon_code ? (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Ticket className="w-4 h-4" />
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{corp.coupon_code}</code>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{corp.admin_email}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span>{corp.member_count}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <PermissionGuard module="corporates" action="update">
                          <Switch
                            checked={corp.is_active !== false}
                            onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: corp.id, is_active: checked })}
                          />
                        </PermissionGuard>
                        <Badge variant={corp.is_active !== false ? 'default' : 'secondary'} className="text-xs">
                          {corp.is_active !== false ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(corp.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setViewingCorp(corp)} title="View Details">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <PermissionGuard module="corporates" action="delete">
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(corp)} title="Delete">
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </PermissionGuard>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Corporate Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Corporate</DialogTitle>
            <DialogDescription>Add a new corporate account with an admin user.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Corporate Name <span className="text-destructive">*</span></Label>
              <Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="e.g., Acme Corporation" />
            </div>
            <div className="space-y-2">
              <Label>Coupon Code</Label>
              <Input value={formData.coupon_code} onChange={e => setFormData(p => ({ ...p, coupon_code: e.target.value }))} placeholder="e.g., ACME2024" />
            </div>
            <Separator />
            <div className="space-y-3 p-4 rounded-lg border border-primary/20 bg-primary/5">
              <p className="text-sm font-medium text-primary">Admin Credentials</p>
              <div className="space-y-2">
                <Label>Admin Email <span className="text-destructive">*</span></Label>
                <Input type="email" value={formData.admin_email} onChange={e => setFormData(p => ({ ...p, admin_email: e.target.value }))} placeholder="admin@company.com" />
              </div>
              <div className="space-y-2">
                <Label>Password <span className="text-destructive">*</span></Label>
                <Input type="password" value={formData.admin_password} onChange={e => setFormData(p => ({ ...p, admin_password: e.target.value }))} placeholder="Min 6 characters" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(formData)} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Corporate</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteTarget?.name}" along with all its members and admin mappings. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Corporate Details Dialog */}
      <Dialog open={!!viewingCorp} onOpenChange={open => !open && setViewingCorp(null)}>
        <DialogContent className="sm:max-w-[650px] p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" /> {viewingCorp?.name}
            </DialogTitle>
            <DialogDescription>Corporate details and member list</DialogDescription>
          </DialogHeader>

          <div className="px-6 pb-4">
            <div className="grid grid-cols-2 gap-4 p-4 rounded-lg border bg-muted/30">
              <div>
                <p className="text-xs text-muted-foreground">Coupon Code</p>
                <p className="font-medium">{viewingCorp?.coupon_code || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Admin Email</p>
                <p className="font-medium">{viewingCorp?.admin_email || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Members</p>
                <p className="font-medium">{viewingCorp?.member_count || 0}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="font-medium">{viewingCorp?.created_at ? new Date(viewingCorp.created_at).toLocaleDateString() : '—'}</p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="px-6 py-4">
            <h3 className="font-semibold text-sm mb-3">Members ({members.length})</h3>
            <ScrollArea className="max-h-[300px]">
              {membersLoading ? (
                <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
              ) : members.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No members yet</p>
              ) : (
                <div className="space-y-1">
                  {members.map(member => (
                    <div key={member.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                      <div>
                        <p className="text-sm font-medium">{member.email}</p>
                        <p className="text-xs text-muted-foreground">Added {new Date(member.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-muted/30">
            <Button variant="outline" onClick={() => setViewingCorp(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CorporatesPage;
