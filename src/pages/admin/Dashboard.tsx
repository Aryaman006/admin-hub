 import { useEffect, useState } from 'react';
 import { Users, CreditCard, Clock, TrendingUp, Video, Radio } from 'lucide-react';
 import { supabase } from '@/integrations/supabase/client';
 import { usePermissions } from '@/contexts/PermissionsContext';
 
 import PageHeader from '@/components/admin/PageHeader';
 import StatCard from '@/components/admin/StatCard';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
 import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, BarChart, Bar } from 'recharts';
 
const Dashboard = () => {
  const { canRead } = usePermissions();
  const canViewPayments = canRead('payments');
   const [stats, setStats] = useState({
     totalUsers: 0,
     activeSubscriptions: 0,
     totalRevenue: 0,
     totalWatchTime: 0,
   });
   const [trendingVideos, setTrendingVideos] = useState<any[]>([]);
   const [upcomingClasses, setUpcomingClasses] = useState<any[]>([]);
   const [userGrowthData, setUserGrowthData] = useState<any[]>([]);
   const [revenueData, setRevenueData] = useState<any[]>([]);
 
   useEffect(() => {
     fetchDashboardData();
   }, []);
 
   const fetchDashboardData = async () => {
     // Fetch total users
     const { count: usersCount } = await supabase
       .from('profiles')
       .select('*', { count: 'exact', head: true });
 
     // Fetch active subscriptions
     const { count: subsCount } = await supabase
       .from('subscriptions')
       .select('*', { count: 'exact', head: true })
       .eq('status', 'active');
 
     // Fetch total revenue
     const { data: payments } = await supabase
       .from('payments')
       .select('amount')
       .eq('status', 'completed');
 
     const totalRevenue = (payments as any[])?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
 
     // Fetch total watch time from videos
     const { data: videoStats } = await supabase
       .from('videos')
       .select('total_watch_time_seconds');
 
     const totalWatchTime = (videoStats as any[])?.reduce((sum, v) => sum + ((v.total_watch_time_seconds || 0) / 60), 0) || 0;
 
     setStats({
       totalUsers: usersCount || 0,
       activeSubscriptions: subsCount || 0,
       totalRevenue,
       totalWatchTime,
     });
 
     // Fetch trending videos
     const { data: videos } = await supabase
       .from('videos')
       .select('id, title, views_count, total_watch_time_seconds')
       .order('views_count', { ascending: false })
       .limit(5);
 
     setTrendingVideos(videos || []);
 
     // Fetch upcoming classes
     const { data: classes } = await supabase
       .from('live_sessions')
       .select('*')
       .gte('scheduled_at', new Date().toISOString())
       .order('scheduled_at', { ascending: true })
       .limit(5);
 
      setUpcomingClasses(classes || []);

      // Aggregate user growth by month from profiles
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('created_at')
        .order('created_at', { ascending: true });

      const monthlyUserGrowth: Record<string, number> = {};
      (allProfiles || []).forEach((profile: any) => {
        const date = new Date(profile.created_at);
        const monthKey = date.toLocaleString('default', { month: 'short', year: '2-digit' });
        monthlyUserGrowth[monthKey] = (monthlyUserGrowth[monthKey] || 0) + 1;
      });

      // Convert to cumulative growth for chart
      let cumulative = 0;
      const userGrowth = Object.entries(monthlyUserGrowth).slice(-6).map(([month, count]) => {
        cumulative += count;
        return { month: month.split(' ')[0], users: cumulative };
      });
      setUserGrowthData(userGrowth.length > 0 ? userGrowth : [{ month: 'Now', users: usersCount || 0 }]);

      // Aggregate revenue by month from payments
      const { data: allPayments } = await supabase
        .from('payments')
        .select('amount, created_at')
        .eq('status', 'completed')
        .order('created_at', { ascending: true });

      const monthlyRevenue: Record<string, number> = {};
      (allPayments || []).forEach((payment: any) => {
        const date = new Date(payment.created_at);
        const monthKey = date.toLocaleString('default', { month: 'short', year: '2-digit' });
        monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + (payment.amount || 0);
      });

      const revenueGrowth = Object.entries(monthlyRevenue).slice(-6).map(([month, revenue]) => ({
        month: month.split(' ')[0],
        revenue,
      }));
      setRevenueData(revenueGrowth.length > 0 ? revenueGrowth : [{ month: 'Now', revenue: totalRevenue }]);
    };
 
   const formatWatchTime = (minutes: number) => {
     const hours = Math.floor(minutes / 60);
     if (hours > 1000) {
       return `${(hours / 1000).toFixed(1)}K hrs`;
     }
     return `${hours} hrs`;
   };
 
   const formatCurrency = (amount: number) => {
     return new Intl.NumberFormat('en-IN', {
       style: 'currency',
       currency: 'INR',
       maximumFractionDigits: 0,
     }).format(amount);
   };
 
   const chartConfig = {
     users: { label: 'Users', color: 'hsl(var(--primary))' },
     revenue: { label: 'Revenue', color: 'hsl(var(--primary))' },
   };
 
   return (
     <>
       <PageHeader
         title="Dashboard"
         description="Welcome back! Here's an overview of your platform."
       />
 
       {/* Stats Grid */}
       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
         <StatCard
           title="Total Users"
           value={stats.totalUsers.toLocaleString()}
           icon={<Users className="w-6 h-6" />}
           trend={{ value: 12, isPositive: true }}
         />
          {canViewPayments && (
            <StatCard
              title="Active Subscriptions"
              value={stats.activeSubscriptions.toLocaleString()}
              icon={<CreditCard className="w-6 h-6" />}
              trend={{ value: 8, isPositive: true }}
            />
          )}
          {canViewPayments && (
            <StatCard
              title="Total Revenue"
              value={formatCurrency(stats.totalRevenue)}
              icon={<TrendingUp className="w-6 h-6" />}
              trend={{ value: 15, isPositive: true }}
            />
          )}
         <StatCard
           title="Watch Time"
           value={formatWatchTime(stats.totalWatchTime)}
           icon={<Clock className="w-6 h-6" />}
           trend={{ value: 22, isPositive: true }}
         />
       </div>
 
       {/* Charts Row */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
         <Card>
           <CardHeader>
             <CardTitle className="text-lg">User Growth</CardTitle>
           </CardHeader>
           <CardContent>
             <ChartContainer config={chartConfig} className="h-[250px]">
               <AreaChart data={userGrowthData}>
                 <XAxis dataKey="month" />
                 <YAxis />
                 <ChartTooltip content={<ChartTooltipContent />} />
                 <Area
                   type="monotone"
                   dataKey="users"
                   stroke="hsl(var(--primary))"
                   fill="hsl(var(--primary)/0.2)"
                 />
               </AreaChart>
             </ChartContainer>
           </CardContent>
         </Card>
 
          {canViewPayments && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Revenue Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[250px]">
                  <BarChart data={revenueData}>
                    <XAxis dataKey="month" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="revenue"
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}
       </div>
 
       {/* Bottom Row */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <Card>
           <CardHeader>
             <CardTitle className="text-lg flex items-center gap-2">
               <Video className="w-5 h-5" />
               Trending Videos
             </CardTitle>
           </CardHeader>
           <CardContent>
             <div className="space-y-4">
               {trendingVideos.length === 0 ? (
                 <p className="text-muted-foreground text-sm">No videos yet</p>
               ) : (
                 trendingVideos.map((video, index) => (
                   <div key={video.id} className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                       <span className="text-sm font-medium text-muted-foreground w-6">
                         #{index + 1}
                       </span>
                       <span className="font-medium">{video.title}</span>
                     </div>
                     <span className="text-sm text-muted-foreground">
                       {video.views_count?.toLocaleString()} views
                     </span>
                   </div>
                 ))
               )}
             </div>
           </CardContent>
         </Card>
 
         <Card>
           <CardHeader>
             <CardTitle className="text-lg flex items-center gap-2">
               <Radio className="w-5 h-5" />
               Upcoming Live Classes
             </CardTitle>
           </CardHeader>
           <CardContent>
             <div className="space-y-4">
               {upcomingClasses.length === 0 ? (
                 <p className="text-muted-foreground text-sm">No upcoming classes</p>
               ) : (
                 upcomingClasses.map((cls) => (
                   <div key={cls.id} className="flex items-center justify-between">
                     <div>
                       <p className="font-medium">{cls.title}</p>
                       <p className="text-sm text-muted-foreground">
                         {new Date(cls.scheduled_at).toLocaleDateString()} at{' '}
                         {new Date(cls.scheduled_at).toLocaleTimeString([], {
                           hour: '2-digit',
                           minute: '2-digit',
                         })}
                       </p>
                     </div>
                     <span className="text-sm text-muted-foreground">
                       {cls.max_participants || 0} max
                     </span>
                   </div>
                 ))
               )}
             </div>
           </CardContent>
         </Card>
       </div>
     </>
   );
 };
 
 export default Dashboard;