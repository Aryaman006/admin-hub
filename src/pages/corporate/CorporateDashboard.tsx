import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCorporateAuth } from '@/contexts/CorporateAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Building2, Users, UserPlus, Upload, X, LogOut, Calendar, Hash, Shield,
} from 'lucide-react';
import { toast } from 'sonner';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface CorporateMember {
  id: string;
  corporate_id: string;
  email: string;
  created_at: string;
  subscription_status?: 'activated' | 'pending';
}

const CorporateDashboard = () => {
  const { corporate, adminEmail, signOut } = useCorporateAuth();
  const [members, setMembers] = useState<CorporateMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [bulkEmails, setBulkEmails] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [activeSubs, setActiveSubs] = useState(0);

  const fetchMembers = useCallback(async () => {
    if (!corporate) return;
    setIsLoading(true);

    const { data, error } = await supabase
      .from('corporate_members' as any)
      .select('*')
      .eq('corporate_id', corporate.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to fetch members');
      setIsLoading(false);
      return;
    }

    const membersList = (data || []) as unknown as CorporateMember[];

    // Check subscription status
    if (membersList.length > 0) {
      const { data: subData } = await supabase
        .from('subscriptions' as any)
        .select('user_id, corporate_id')
        .eq('corporate_id', corporate.id)
        .eq('is_corporate', true)
        .eq('status', 'active');

      const activeSubsList = (subData || []) as any[];
      setActiveSubs(activeSubsList.length);

      if (activeSubsList.length > 0) {
        const userIds = activeSubsList.map((s: any) => s.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', userIds);

        const activatedEmails = new Set(
          (profiles || []).map((p: any) => p.email?.toLowerCase()).filter(Boolean)
        );

        membersList.forEach((m) => {
          m.subscription_status = activatedEmails.has(m.email) ? 'activated' : 'pending';
        });
      } else {
        membersList.forEach((m) => (m.subscription_status = 'pending'));
      }
    }

    setMembers(membersList);
    setIsLoading(false);
  }, [corporate]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const insertEmails = async (emails: string[]): Promise<{ added: number; skipped: number }> => {
    if (!corporate || emails.length === 0) return { added: 0, skipped: 0 };

    const { data: existingData } = await supabase
      .from('corporate_members' as any)
      .select('email')
      .eq('corporate_id', corporate.id);
    const existingEmails = new Set((existingData || []).map((m: any) => m.email));

    const newEmails = emails.filter((em) => !existingEmails.has(em));
    const skipped = emails.length - newEmails.length;

    if (newEmails.length > 0) {
      const rows = newEmails.map((email) => ({ corporate_id: corporate.id, email }));
      for (let i = 0; i < rows.length; i += 50) {
        // @ts-expect-error - corporate_members table not in generated types
        await supabase.from('corporate_members').insert(rows.slice(i, i + 50));
      }
    }

    return { added: newEmails.length, skipped };
  };

  const addSingleMember = async () => {
    if (!corporate || !newMemberEmail.trim()) return;
    const email = newMemberEmail.trim().toLowerCase();
    if (!EMAIL_REGEX.test(email)) {
      toast.error('Invalid email address');
      return;
    }

    setIsAddingMember(true);
    const result = await insertEmails([email]);
    if (result.skipped > 0) {
      toast.error('Email already exists');
    } else {
      toast.success('Member added');
      setNewMemberEmail('');
    }
    fetchMembers();
    setIsAddingMember(false);
  };

  const addBulkMembers = async () => {
    if (!corporate || !bulkEmails.trim()) return;
    const emails = bulkEmails
      .split(/[,\n\r]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => EMAIL_REGEX.test(e));

    if (emails.length === 0) {
      toast.error('No valid emails found');
      return;
    }

    setIsAddingMember(true);
    const result = await insertEmails(emails);
    toast.success(`Added ${result.added}, skipped ${result.skipped} duplicates`);
    setBulkEmails('');
    fetchMembers();
    setIsAddingMember(false);
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !corporate) return;

    const text = await file.text();
    const emails = text
      .split(/[\r\n,]+/)
      .map((l) => l.replace(/["']/g, '').trim().toLowerCase())
      .filter((em) => EMAIL_REGEX.test(em));

    if (emails.length === 0) {
      toast.error('No valid emails found in file');
      e.target.value = '';
      return;
    }

    setIsAddingMember(true);
    const result = await insertEmails(emails);
    toast.success(`Added ${result.added}, skipped ${result.skipped} duplicates`);
    fetchMembers();
    e.target.value = '';
    setIsAddingMember(false);
  };

  const deleteMember = async (memberId: string) => {
    const { error } = await supabase.from('corporate_members' as any).delete().eq('id', memberId);
    if (error) {
      toast.error('Failed to remove member');
      return;
    }
    toast.success('Member removed');
    fetchMembers();
  };

  if (!corporate) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">No corporate account found.</p>
      </div>
    );
  }

  const seatMax = corporate.max_members;
  const seatPercent = seatMax ? Math.min((activeSubs / seatMax) * 100, 100) : 0;
  const isExpired = corporate.expires_at ? new Date(corporate.expires_at) < new Date() : false;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-lg">{corporate.name}</h1>
              <p className="text-xs text-muted-foreground">Corporate Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">{adminEmail}</span>
            <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground hover:text-destructive">
              <LogOut className="w-4 h-4 mr-1" /> Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{members.length}</p>
                <p className="text-xs text-muted-foreground">Total Members</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeSubs}</p>
                <p className="text-xs text-muted-foreground">Active Subscriptions</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                <Hash className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-lg font-bold font-mono">{corporate.coupon_code}</p>
                <p className="text-xs text-muted-foreground">Coupon Code</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Calendar className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-bold">
                  {corporate.expires_at
                    ? new Date(corporate.expires_at).toLocaleDateString()
                    : 'No Expiry'}
                </p>
                <div className="flex items-center gap-1">
                  <p className="text-xs text-muted-foreground">Expiry</p>
                  {corporate.expires_at && (
                    <Badge variant={isExpired ? 'destructive' : 'default'} className="text-[10px] px-1 py-0">
                      {isExpired ? 'Expired' : 'Active'}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Seat Usage */}
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Seat Usage</span>
              <span>
                {activeSubs} {seatMax ? `/ ${seatMax} seats used` : 'seats used (Unlimited)'}
              </span>
            </div>
            {seatMax && <Progress value={seatPercent} className="h-2" />}
          </CardContent>
        </Card>

        {/* Member Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" /> Manage Members
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add Members Tabs */}
            <Tabs defaultValue="single" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="single">Single</TabsTrigger>
                <TabsTrigger value="bulk">Bulk Paste</TabsTrigger>
                <TabsTrigger value="csv">CSV Upload</TabsTrigger>
              </TabsList>

              <TabsContent value="single" className="space-y-2 mt-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="user@example.com"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addSingleMember()}
                  />
                  <Button onClick={addSingleMember} disabled={isAddingMember} size="sm" className="shrink-0">
                    <UserPlus className="w-4 h-4 mr-1" /> Add
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="bulk" className="space-y-2 mt-3">
                <Textarea
                  placeholder={'Paste emails separated by commas or new lines\ne.g.\nuser1@example.com\nuser2@example.com'}
                  value={bulkEmails}
                  onChange={(e) => setBulkEmails(e.target.value)}
                  rows={4}
                />
                <Button onClick={addBulkMembers} disabled={isAddingMember || !bulkEmails.trim()} size="sm">
                  <UserPlus className="w-4 h-4 mr-1" /> Add All
                </Button>
              </TabsContent>

              <TabsContent value="csv" className="space-y-2 mt-3">
                <div className="flex items-center gap-3">
                  <Label htmlFor="corp-csv-upload" className="cursor-pointer">
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-md border border-dashed text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                      <Upload className="w-4 h-4" />
                      Choose CSV File
                    </div>
                  </Label>
                  <input
                    id="corp-csv-upload"
                    type="file"
                    accept=".csv,.txt"
                    className="hidden"
                    onChange={handleCsvUpload}
                  />
                  <span className="text-xs text-muted-foreground">One email per line or comma-separated</span>
                </div>
              </TabsContent>
            </Tabs>

            <Separator />

            {/* Members List */}
            {isLoading ? (
              <p className="text-center text-muted-foreground py-4">Loading members...</p>
            ) : members.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No members yet. Add your first member above.</p>
            ) : (
              <div className="space-y-1">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">{member.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Added {new Date(member.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={member.subscription_status === 'activated' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {member.subscription_status === 'activated' ? 'Activated' : 'Pending'}
                      </Badge>
                      <Button variant="ghost" size="icon" onClick={() => deleteMember(member.id)} className="h-8 w-8">
                        <X className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CorporateDashboard;
