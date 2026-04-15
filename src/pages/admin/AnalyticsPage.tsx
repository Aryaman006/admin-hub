import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

import PageHeader from '@/components/admin/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Video, FolderOpen, Clock, CheckCircle } from 'lucide-react';
import StatCard from '@/components/admin/StatCard';
 
 const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];
 
 const AnalyticsPage = () => {
   const [topVideos, setTopVideos] = useState<any[]>([]);
   const [categoryData, setCategoryData] = useState<any[]>([]);
   const [stats, setStats] = useState({
     totalVideos: 0,
     totalCategories: 0,
     totalWatchTime: 0,
     avgCompletionRate: 0,
   });
   const [engagementData, setEngagementData] = useState<any[]>([]);
 
   useEffect(() => {
     fetchAnalytics();
   }, []);
 
  const fetchAnalytics = async () => {
    // Fetch videos with correct field names
    const { data: videos } = await supabase
      .from('videos')
      .select('*, categories(name)')
      .order('total_watch_time_seconds', { ascending: false });

    const videosList = (videos || []) as any[];
    setTopVideos(videosList.slice(0, 10).map(v => ({
      ...v,
      watch_time: Math.floor((v.total_watch_time_seconds || 0) / 60) // Convert to minutes for display
    })));

    // Fetch categories
    const { data: categories } = await supabase.from('categories').select('*');
    const categoriesList = (categories || []) as any[];

    // Calculate category stats using correct field name
    const categoryStats = categoriesList.map((cat) => {
      const categoryVideos = videosList.filter((v) => v.category_id === cat.id);
      const totalViews = categoryVideos.reduce((sum, v) => sum + (v.views_count || 0), 0);
      return { name: cat.name, views: totalViews };
    }).sort((a, b) => b.views - a.views);
    
    setCategoryData(categoryStats.slice(0, 5));

    // Calculate stats using correct field names
    const totalWatchTime = videosList.reduce((sum, v) => sum + ((v.total_watch_time_seconds || 0) / 60), 0);
    const totalCompletions = videosList.reduce((sum, v) => sum + (v.completion_count || 0), 0);
    const totalViews = videosList.reduce((sum, v) => sum + (v.views_count || 0), 0);
    const avgCompletionRate = totalViews > 0 ? Math.round((totalCompletions / totalViews) * 100) : 0;

    setStats({
      totalVideos: videosList.length,
      totalCategories: categoriesList.length,
      totalWatchTime,
      avgCompletionRate,
    });

    // Fetch watch progress for engagement data
    const { data: watchProgress } = await supabase
      .from('watch_progress')
      .select('updated_at, is_completed')
      .order('updated_at', { ascending: false })
      .limit(500);

    // Group by day of week
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayStats = dayNames.map(day => ({ day, views: 0, completions: 0 }));
    
    (watchProgress || []).forEach((wp: any) => {
      const dayIndex = new Date(wp.updated_at).getDay();
      dayStats[dayIndex].views += 1;
      if (wp.is_completed) dayStats[dayIndex].completions += 1;
    });

    // Reorder to start from Monday
    setEngagementData([...dayStats.slice(1), dayStats[0]]);
  };
 
   const formatWatchTime = (minutes: number) => {
     const hours = Math.floor(minutes / 60);
     if (hours > 1000) return `${(hours / 1000).toFixed(1)}K hrs`;
     return `${hours} hrs`;
   };
 
   const chartConfig = {
     views: { label: 'Views', color: 'hsl(var(--primary))' },
     completions: { label: 'Completions', color: 'hsl(var(--secondary))' },
   };
 
   return (
     <>
       <PageHeader title="Analytics" description="Platform performance and engagement metrics" />
 
       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
         <StatCard
           title="Total Videos"
           value={stats.totalVideos}
           icon={<Video className="w-6 h-6" />}
         />
         <StatCard
           title="Categories"
           value={stats.totalCategories}
           icon={<FolderOpen className="w-6 h-6" />}
         />
         <StatCard
           title="Total Watch Time"
           value={formatWatchTime(stats.totalWatchTime)}
           icon={<Clock className="w-6 h-6" />}
         />
         <StatCard
           title="Avg Completion Rate"
           value={`${stats.avgCompletionRate}%`}
           icon={<CheckCircle className="w-6 h-6" />}
         />
       </div>
 
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
         <Card>
           <CardHeader>
             <CardTitle className="text-lg">Top Videos by Watch Time</CardTitle>
           </CardHeader>
           <CardContent>
             <ChartContainer config={chartConfig} className="h-[300px]">
               <BarChart data={topVideos.slice(0, 5)} layout="vertical">
                 <XAxis type="number" />
                 <YAxis type="category" dataKey="title" width={120} tick={{ fontSize: 12 }} />
                 <ChartTooltip content={<ChartTooltipContent />} />
                 <Bar dataKey="watch_time" fill="hsl(var(--primary))" radius={4} />
               </BarChart>
             </ChartContainer>
           </CardContent>
         </Card>
 
         <Card>
           <CardHeader>
             <CardTitle className="text-lg">Top Categories by Views</CardTitle>
           </CardHeader>
           <CardContent>
             <ChartContainer config={chartConfig} className="h-[300px]">
               <PieChart>
                 <Pie
                   data={categoryData}
                   cx="50%"
                   cy="50%"
                   innerRadius={60}
                   outerRadius={100}
                   paddingAngle={2}
                   dataKey="views"
                   nameKey="name"
                   label={({ name }) => name}
                 >
                   {categoryData.map((_, index) => (
                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                   ))}
                 </Pie>
                 <ChartTooltip content={<ChartTooltipContent />} />
               </PieChart>
             </ChartContainer>
           </CardContent>
         </Card>
       </div>
 
       <Card>
         <CardHeader>
           <CardTitle className="text-lg">Weekly Engagement Trends</CardTitle>
         </CardHeader>
         <CardContent>
           <ChartContainer config={chartConfig} className="h-[300px]">
             <LineChart data={engagementData}>
               <XAxis dataKey="day" />
               <YAxis />
               <ChartTooltip content={<ChartTooltipContent />} />
               <Line type="monotone" dataKey="views" stroke="hsl(var(--primary))" strokeWidth={2} />
               <Line type="monotone" dataKey="completions" stroke="hsl(var(--secondary))" strokeWidth={2} />
             </LineChart>
           </ChartContainer>
         </CardContent>
       </Card>
     </>
   );
 };
 
 export default AnalyticsPage;