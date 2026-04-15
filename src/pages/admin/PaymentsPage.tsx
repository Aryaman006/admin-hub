import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

import PageHeader from '@/components/admin/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, IndianRupee, TrendingUp, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import StatCard from '@/components/admin/StatCard';

const PaymentsPage = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [userMap, setUserMap] = useState<Record<string, { name: string; email: string }>>({});
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalGst: 0,
    successfulPayments: 0,
  });

  useEffect(() => {
    fetchPayments();
  }, []);

  useEffect(() => {
    let filtered = payments;

    if (statusFilter !== 'all') {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((p) => {
        const user = userMap[p.user_id];
        return (
          user?.name?.toLowerCase().includes(q) ||
          user?.email?.toLowerCase().includes(q) ||
          p.user_id?.toLowerCase().includes(q)
        );
      });
    }

    setFilteredPayments(filtered);
  }, [searchQuery, statusFilter, payments, userMap]);

  const fetchPayments = async () => {
    setIsLoading(true);

    // Fetch payments
    const { data, error } = await supabase
      .from('payments')
      .select('*, subscriptions(plan_name)')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to fetch payments');
      setIsLoading(false);
      return;
    }

    setPayments(data || []);
    setFilteredPayments(data || []);

    const completed = (data || []).filter((p) => p.status === 'completed');
    setStats({
      totalRevenue: completed.reduce((sum, p) => sum + (p.amount || 0), 0),
      totalGst: completed.reduce((sum, p) => sum + (p.gst_amount || 0), 0),
      successfulPayments: completed.length,
    });

    // Fetch user data (names + emails) from admin-list-users edge function
    const combined: Record<string, { name: string; email: string }> = {};
    try {
      const res = await supabase.functions.invoke('admin-list-users');
      if (res.data?.users) {
        for (const u of res.data.users) {
          combined[u.id] = {
            name: u.full_name || '',
            email: u.email || '',
          };
        }
      }
    } catch (e) {
      console.error('Could not fetch user data:', e);
    }
    setUserMap(combined);
    setIsLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <>
      <PageHeader title="Payments" description="View payment history and revenue" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          icon={<IndianRupee className="w-6 h-6" />}
        />
        <StatCard
          title="Total GST Collected"
          value={formatCurrency(stats.totalGst)}
          icon={<TrendingUp className="w-6 h-6" />}
        />
        <StatCard
          title="Successful Payments"
          value={stats.successfulPayments}
          icon={<CreditCard className="w-6 h-6" />}
        />
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>GST</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading payments...
                    </TableCell>
                  </TableRow>
                ) : filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No payments found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map((payment) => {
                    const user = userMap[payment.user_id];
                    return (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{user?.name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{user?.email || payment.user_id?.slice(0, 8) + '...'}</p>
                          </div>
                        </TableCell>
                        <TableCell>{payment.subscriptions?.plan_name || '-'}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(payment.amount)}</TableCell>
                        <TableCell>{formatCurrency(payment.gst_amount || 0)}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(payment.status)}>{payment.status}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(payment.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default PaymentsPage;
