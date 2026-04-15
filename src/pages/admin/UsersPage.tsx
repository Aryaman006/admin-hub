import { useEffect, useState } from "react";
import PermissionGuard from '@/components/admin/PermissionGuard';
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/admin/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Search, Eye, Ban, CheckCircle, Trash2, CreditCard } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface UserData {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  email?: string;
  subscription_status?: string;
  yogic_points?: number;
  watch_time?: number;
  is_blocked?: boolean;
}

const UsersPage = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState<UserData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [subscriptionUser, setSubscriptionUser] = useState<UserData | null>(null);
  const [subForm, setSubForm] = useState({
    plan_name: 'Monthly Plan',
    status: 'active',
    starts_at: new Date().toISOString().split('T')[0],
    expires_at: '',
    amount_paid: 0,
    gst_amount: 0,
    coupon_code: '',
    payment_id: '',
    is_corporate: false,
    corporate_id: '',
  });
  const [isSavingSub, setIsSavingSub] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const filtered = users.filter(
        (user) =>
          user.full_name?.toLowerCase().includes(q) ||
          user.phone?.toLowerCase().includes(q) ||
          user.email?.toLowerCase().includes(q) ||
          user.user_id?.toLowerCase().includes(q),
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchQuery, users]);

  const fetchUsers = async () => {
    setIsLoading(true);

    const [
      { data: profiles, error: profilesError },
      { data: subscriptions },
      { data: pointsData },
      { data: watchData },
      adminUsersRes,
    ] = await Promise.all([
      supabase.from("profiles").select("id, user_id, full_name, phone, avatar_url, created_at").order("created_at", { ascending: false }),
      supabase.from("subscriptions").select("user_id, status") as any,
      supabase.from("yogic_points_transactions").select("user_id, points") as any,
      supabase.from("watch_progress").select("user_id, watched_seconds") as any,
      supabase.functions.invoke("admin-list-users"),
    ]);

    if (profilesError) {
      toast.error("Failed to fetch users");
      setIsLoading(false);
      return;
    }

    const emailMap: Record<string, string> = {};
    if (adminUsersRes?.data?.users) {
      adminUsersRes.data.users.forEach((u: { id: string; email: string }) => {
        emailMap[u.id] = u.email;
      });
    }

    const combinedUsers: UserData[] = (profiles || []).map((profile: any) => {
      const subscription = subscriptions?.find((s: any) => s.user_id === profile.user_id);
      const userPoints = pointsData?.filter((p: any) => p.user_id === profile.user_id).reduce((sum: number, p: any) => sum + (p.points || 0), 0) || 0;
      const userWatchTime = watchData?.filter((w: any) => w.user_id === profile.user_id).reduce((sum: number, w: any) => sum + (w.watched_seconds || 0), 0) || 0;

      return {
        ...profile,
        email: emailMap[profile.user_id] || "N/A",
        subscription_status: subscription?.status || "free",
        yogic_points: userPoints,
        watch_time: Math.floor(userWatchTime / 60),
        is_blocked: false,
      };
    });

    setUsers(combinedUsers);
    setFilteredUsers(combinedUsers);
    setIsLoading(false);
  };

  const handleDeleteUser = async () => {
    if (!deleteUser) return;
    setIsDeleting(true);
    const { data, error } = await supabase.functions.invoke("delete-user", {
      body: { user_id: deleteUser.user_id },
    });
    setIsDeleting(false);
    setDeleteUser(null);

    if (error || !data?.success) {
      toast.error("Failed to delete user");
      return;
    }
    toast.success("User deleted successfully");
    fetchUsers();
  };

  const handleBlockToggle = async (userId: string, currentStatus: boolean) => {
    toast.info("Block/unblock requires adding is_blocked column to profiles table");
  };

   const openSubscriptionDialog = async (user: UserData) => {
     setSubscriptionUser(user);

     // Fetch existing subscription to pre-populate
     const { data: existing } = await (supabase
       .from('subscriptions')
       .select('*')
       .eq('user_id', user.user_id)
       .maybeSingle() as any);

     if (existing) {
       setSubForm({
          plan_name: existing.plan_name || 'Monthly Plan',
          status: existing.status || 'active',
          starts_at: existing.starts_at ? existing.starts_at.split('T')[0] : new Date().toISOString().split('T')[0],
          expires_at: existing.expires_at ? existing.expires_at.split('T')[0] : '',
          amount_paid: existing.amount_paid || 0,
          gst_amount: existing.gst_amount || 0,
          coupon_code: existing.coupon_code || '',
          payment_id: existing.payment_id || '',
          is_corporate: existing.is_corporate || false,
          corporate_id: existing.corporate_id || '',
        });
      } else {
        setSubForm({
          plan_name: 'Monthly Plan',
          status: 'active',
          starts_at: new Date().toISOString().split('T')[0],
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          amount_paid: 0,
          gst_amount: 0,
          coupon_code: '',
          payment_id: '',
          is_corporate: false,
          corporate_id: '',
       });
     }
   };

  const handleSaveSubscription = async () => {
    if (!subscriptionUser) return;
    setIsSavingSub(true);

    try {
      // Check if subscription exists
      const { data: existing } = await (supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', subscriptionUser.user_id)
        .maybeSingle() as any);

      const payload: any = {
        user_id: subscriptionUser.user_id,
        plan_name: subForm.plan_name,
        status: subForm.status,
        starts_at: subForm.starts_at || new Date().toISOString(),
        expires_at: subForm.expires_at || null,
        amount_paid: subForm.amount_paid || 0,
        gst_amount: subForm.gst_amount || 0,
        coupon_code: subForm.coupon_code || null,
        payment_id: subForm.payment_id || null,
        is_corporate: subForm.is_corporate,
        corporate_id: subForm.corporate_id || null,
      };

      if (existing) {
        const { error } = await (supabase
          .from('subscriptions') as any)
          .update(payload)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase
          .from('subscriptions') as any)
          .insert([payload]);
        if (error) throw error;
      }

      toast.success('Subscription updated successfully');
      setSubscriptionUser(null);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update subscription');
    } finally {
      setIsSavingSub(false);
    }
  };

  const formatWatchTime = (minutes: number) => {
    const hours = Math.floor((minutes || 0) / 60);
    const mins = (minutes || 0) % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <>
      <PageHeader title="Users" description="Manage all users on the platform" />

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, phone or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
               <TableRow>
                   <TableHead>User</TableHead>
                   <TableHead>Email</TableHead>
                   <TableHead>Phone</TableHead>
                   <TableHead>Subscription</TableHead>
                   <TableHead>Watch Time</TableHead>
                   <TableHead>Yogic Points</TableHead>
                   <TableHead>Status</TableHead>
                   <TableHead className="text-right">Actions</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {isLoading ? (
                   <TableRow>
                     <TableCell colSpan={8} className="text-center py-8">Loading users...</TableCell>
                   </TableRow>
                 ) : filteredUsers.length === 0 ? (
                   <TableRow>
                     <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No users found</TableCell>
                   </TableRow>
                 ) : (
                   filteredUsers.map((user) => (
                     <TableRow key={user.id}>
                       <TableCell>
                         <div>
                           <p className="font-medium">{user.full_name || "Unnamed"}</p>
                           <p className="text-xs text-muted-foreground font-mono">{user.user_id.slice(0, 8)}...</p>
                         </div>
                       </TableCell>
                       <TableCell className="text-sm">{user.email}</TableCell>
                       <TableCell className="text-sm">{user.phone || "—"}</TableCell>
                       <TableCell>
                         <Badge
                           variant={user.subscription_status === "active" ? "default" : "secondary"}
                           className="cursor-pointer"
                           onClick={() => openSubscriptionDialog(user)}
                         >
                           {user.subscription_status === "active" ? "Active" : "Free"}
                         </Badge>
                       </TableCell>
                      <TableCell>{formatWatchTime(user.watch_time || 0)}</TableCell>
                      <TableCell>{user.yogic_points || 0}</TableCell>
                      <TableCell>
                        <Badge variant={user.is_blocked ? "destructive" : "outline"}>
                          {user.is_blocked ? "Blocked" : "Active"}
                        </Badge>
                      </TableCell>
                       <TableCell className="text-right">
                         <div className="flex items-center justify-end gap-1">
                           <Button variant="ghost" size="icon" onClick={() => { setSelectedUser(user); setIsDialogOpen(true); }}>
                             <Eye className="w-4 h-4" />
                           </Button>
                           <PermissionGuard module="users" action="update">
                             <Button variant="ghost" size="icon" onClick={() => openSubscriptionDialog(user)} title="Edit Subscription">
                               <CreditCard className="w-4 h-4" />
                             </Button>
                           </PermissionGuard>
                           <PermissionGuard module="users" action="update">
                             <Button variant="ghost" size="icon" onClick={() => handleBlockToggle(user.user_id, user.is_blocked || false)}>
                               {user.is_blocked ? <CheckCircle className="w-4 h-4 text-primary" /> : <Ban className="w-4 h-4 text-destructive" />}
                             </Button>
                           </PermissionGuard>
                           <PermissionGuard module="users" action="delete">
                             <Button variant="ghost" size="icon" onClick={() => setDeleteUser(user)}>
                               <Trash2 className="w-4 h-4 text-destructive" />
                             </Button>
                           </PermissionGuard>
                         </div>
                       </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{selectedUser.full_name || "Unnamed"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedUser.phone || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Subscription</p>
                  <p className="font-medium">{selectedUser.subscription_status || "Free"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Watch Time</p>
                  <p className="font-medium">{formatWatchTime(selectedUser.watch_time || 0)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Yogic Points</p>
                  <p className="font-medium">{selectedUser.yogic_points || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">User ID</p>
                  <p className="font-medium font-mono text-xs">{selectedUser.user_id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Joined</p>
                  <p className="font-medium">{new Date(selectedUser.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete <strong>{deleteUser?.full_name || deleteUser?.email}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUser(null)} disabled={isDeleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subscription Edit Dialog */}
      <Dialog open={!!subscriptionUser} onOpenChange={(open) => !open && setSubscriptionUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Subscription</DialogTitle>
            <DialogDescription>
              Manage subscription for <strong>{subscriptionUser?.full_name || subscriptionUser?.email}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label>Plan Name</Label>
              <Select value={subForm.plan_name} onValueChange={(v) => setSubForm({ ...subForm, plan_name: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Monthly Plan">Monthly Plan</SelectItem>
                  <SelectItem value="Yearly Plan">Yearly Plan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={subForm.status} onValueChange={(v) => setSubForm({ ...subForm, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Starts At</Label>
              <Input
                type="date"
                value={subForm.starts_at}
                onChange={(e) => setSubForm({ ...subForm, starts_at: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Expires At</Label>
              <Input
                type="date"
                value={subForm.expires_at}
                onChange={(e) => setSubForm({ ...subForm, expires_at: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Amount Paid (₹)</Label>
              <Input
                type="number"
                value={subForm.amount_paid}
                onChange={(e) => setSubForm({ ...subForm, amount_paid: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>GST Amount (₹)</Label>
              <Input
                type="number"
                value={subForm.gst_amount}
                onChange={(e) => setSubForm({ ...subForm, gst_amount: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Coupon Code</Label>
              <Input
                value={subForm.coupon_code}
                onChange={(e) => setSubForm({ ...subForm, coupon_code: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label>Payment ID</Label>
              <Input
                value={subForm.payment_id}
                onChange={(e) => setSubForm({ ...subForm, payment_id: e.target.value })}
                placeholder="Transaction ID"
              />
            </div>
            <div className="space-y-2">
              <Label>Corporate ID</Label>
              <Input
                value={subForm.corporate_id}
                onChange={(e) => setSubForm({ ...subForm, corporate_id: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Label>Corporate</Label>
              <Switch
                checked={subForm.is_corporate}
                onCheckedChange={(checked) => setSubForm({ ...subForm, is_corporate: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubscriptionUser(null)} disabled={isSavingSub}>Cancel</Button>
            <Button onClick={handleSaveSubscription} disabled={isSavingSub}>
              {isSavingSub ? 'Saving...' : 'Save Subscription'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UsersPage;
