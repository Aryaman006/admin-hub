import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/contexts/PermissionsContext';
import PermissionGuard from '@/components/admin/PermissionGuard';
 
 import PageHeader from '@/components/admin/PageHeader';
 import { Card, CardContent } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Badge } from '@/components/ui/badge';
 import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
 } from '@/components/ui/table';
 import { Plus, Pencil, Trash2, Eye, Clock, Award, Search, RefreshCw } from 'lucide-react';
 import { toast } from 'sonner';
 import VideoForm from '@/components/admin/VideoForm';
 
 interface Video {
  id: string;
    title: string;
    description: string | null;
    category_id: string | null;
    is_premium: boolean;
    duration_seconds: number;
    yogic_points: number;
    thumbnail_url: string | null;
    video_url: string | null;
    is_published: boolean;
    views: number;
    categories?: { name: string } | null;
 }
 
 interface Category {
   id: string;
   name: string;
 }
 
const VideosPage = () => {
    const [videos, setVideos] = useState<Video[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [filteredVideos, setFilteredVideos] = useState<Video[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingVideo, setEditingVideo] = useState<Video | null>(null);
    const [isScanning, setIsScanning] = useState(false);
 
   useEffect(() => {
     fetchVideos();
     fetchCategories();
   }, []);
 
   useEffect(() => {
     if (searchQuery) {
       const filtered = videos.filter((video) =>
         video.title?.toLowerCase().includes(searchQuery.toLowerCase())
       );
       setFilteredVideos(filtered);
     } else {
       setFilteredVideos(videos);
     }
   }, [searchQuery, videos]);
 
   const fetchVideos = async () => {
     setIsLoading(true);
     const { data, error } = await supabase
       .from('videos')
       .select('*, categories(name)')
       .order('created_at', { ascending: false });
 
     if (error) {
       toast.error('Failed to fetch videos');
     } else {
       setVideos(data || []);
       setFilteredVideos(data || []);
     }
     setIsLoading(false);
   };
 
   const fetchCategories = async () => {
     const { data } = await supabase.from('categories').select('id, name');
     setCategories(data || []);
   };
 
   const handleOpenDialog = (video?: Video) => {
     setEditingVideo(video || null);
     setIsDialogOpen(true);
   };
 
   const handleDelete = async (id: string) => {
     if (!confirm('Are you sure you want to delete this video?')) return;
 
     const { error } = await supabase.from('videos').delete().eq('id', id);
 
     if (error) {
       toast.error('Failed to delete video');
     } else {
       toast.success('Video deleted successfully');
       fetchVideos();
     }
   };
 
   const togglePublish = async (video: Video) => {
     const { error } = await supabase
       .from('videos')
       // @ts-expect-error - Schema mismatch with actual DB
       .update({ is_published: !video.is_published })
       .eq('id', video.id);
 
     if (error) {
       toast.error('Failed to update video');
     } else {
       toast.success(`Video ${video.is_published ? 'unpublished' : 'published'}`);
       fetchVideos();
     }
   };
 
    const formatDuration = (seconds: number) => {
      const mins = Math.floor((seconds || 0) / 60);
      const secs = (seconds || 0) % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const detectDurationFromUrl = (url: string): Promise<number> => {
      return new Promise((resolve) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.crossOrigin = 'anonymous';
        video.onloadedmetadata = () => {
          const duration = Math.round(video.duration);
          URL.revokeObjectURL(video.src);
          resolve(duration);
        };
        video.onerror = () => {
          resolve(0);
        };
        video.src = url;
      });
    };

    const handleScanDurations = async () => {
      const videosToScan = videos.filter(v => v.video_url && (!v.duration_seconds || v.duration_seconds === 0));
      if (videosToScan.length === 0) {
        toast.info('All videos already have durations set');
        return;
      }

      setIsScanning(true);
      let updated = 0;

      for (const v of videosToScan) {
        try {
          const duration = await detectDurationFromUrl(v.video_url!);
          if (duration > 0) {
            const { error } = await supabase
              .from('videos')
              // @ts-expect-error - Schema mismatch with actual DB
              .update({ duration_seconds: duration })
              .eq('id', v.id);
            if (!error) updated++;
          }
        } catch (e) {
          console.error(`Failed to detect duration for ${v.title}:`, e);
        }
      }

      toast.success(`Updated duration for ${updated} of ${videosToScan.length} videos`);
      setIsScanning(false);
      fetchVideos();
    };
 
   return (
     <>
         <PageHeader title="Videos" description="Manage video content">
           <div className="flex gap-2">
             <PermissionGuard module="videos" action="update">
               <Button variant="outline" onClick={handleScanDurations} disabled={isScanning}>
                 <RefreshCw className={cn("w-4 h-4 mr-2", isScanning && "animate-spin")} />
                 {isScanning ? 'Scanning...' : 'Scan Durations'}
               </Button>
             </PermissionGuard>
             <PermissionGuard module="videos" action="create">
               <Button onClick={() => handleOpenDialog()}>
                 <Plus className="w-4 h-4 mr-2" />
                 Add Video
               </Button>
             </PermissionGuard>
           </div>
         </PageHeader>
 
       <Card>
         <CardContent className="p-6">
           <div className="flex items-center gap-4 mb-6">
             <div className="relative flex-1 max-w-sm">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
               <Input
                 placeholder="Search videos..."
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
                   <TableHead>Video</TableHead>
                   <TableHead>Category</TableHead>
                   <TableHead>Type</TableHead>
                   <TableHead>Stats</TableHead>
                   <TableHead>Status</TableHead>
                   <TableHead className="text-right">Actions</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {isLoading ? (
                   <TableRow>
                     <TableCell colSpan={6} className="text-center py-8">
                       Loading videos...
                     </TableCell>
                   </TableRow>
                 ) : filteredVideos.length === 0 ? (
                   <TableRow>
                     <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                       No videos found
                     </TableCell>
                   </TableRow>
                 ) : (
                   filteredVideos.map((video) => (
                     <TableRow key={video.id}>
                       <TableCell>
                         <div className="flex items-center gap-3">
                           {video.thumbnail_url ? (
                             <img
                               src={video.thumbnail_url}
                               alt={video.title}
                               className="w-16 h-10 rounded object-cover"
                             />
                           ) : (
                             <div className="w-16 h-10 rounded bg-muted flex items-center justify-center">
                               <span className="text-xs text-muted-foreground">No img</span>
                             </div>
                           )}
                           <div>
                             <p className="font-medium">{video.title}</p>
                             <p className="text-xs text-muted-foreground flex items-center gap-1">
                               <Clock className="w-3 h-3" />
                               {formatDuration(video.duration_seconds)}
                             </p>
                           </div>
                         </div>
                       </TableCell>
                       <TableCell>{video.categories?.name || '-'}</TableCell>
                       <TableCell>
                         <Badge variant={video.is_premium ? 'default' : 'secondary'}>
                           {video.is_premium ? 'Premium' : 'Free'}
                         </Badge>
                       </TableCell>
                       <TableCell>
                         <div className="text-sm space-y-1">
                           <div className="flex items-center gap-1 text-muted-foreground">
                             <Eye className="w-3 h-3" /> {video.views || 0}
                           </div>
                           <div className="flex items-center gap-1 text-muted-foreground">
                             <Award className="w-3 h-3" /> {video.yogic_points || 0} pts
                           </div>
                         </div>
                       </TableCell>
                       <TableCell>
                         <Badge
                           variant={video.is_published ? 'outline' : 'secondary'}
                           className="cursor-pointer"
                           onClick={() => togglePublish(video)}
                         >
                           {video.is_published ? 'Published' : 'Draft'}
                         </Badge>
                       </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <PermissionGuard module="videos" action="update">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenDialog(video)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            </PermissionGuard>
                            <PermissionGuard module="videos" action="delete">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(video.id)}
                              >
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
 
       <VideoForm
         open={isDialogOpen}
         onOpenChange={setIsDialogOpen}
         video={editingVideo}
         categories={categories}
         onSuccess={fetchVideos}
       />
     </>
   );
 };
 
 export default VideosPage;