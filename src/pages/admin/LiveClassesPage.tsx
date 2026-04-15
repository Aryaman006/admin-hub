import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import PermissionGuard from '@/components/admin/PermissionGuard';

import PageHeader from '@/components/admin/PageHeader';
import FileUpload from '@/components/admin/FileUpload';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Users, Calendar, Clock, Link2, Crown, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

const LiveClassesPage = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructor_name: '',
    scheduled_at: '',
    duration_minutes: 60,
    is_premium: false,
    stream_url: '',
    thumbnail_url: '',
  });
 
   useEffect(() => {
     fetchClasses();
   }, []);
 
   const fetchClasses = async () => {
     setIsLoading(true);
     const { data, error } = await supabase
       .from('live_sessions')
       .select('*')
       .order('scheduled_at', { ascending: false });
 
     if (error) {
       toast.error('Failed to fetch live classes');
     } else {
       setClasses(data || []);
     }
     setIsLoading(false);
   };
 
  const handleOpenDialog = (cls?: any) => {
  if (cls) {
    const date = new Date(cls.scheduled_at);
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);

    setEditingClass(cls);
    setFormData({
      title: cls.title,
      description: cls.description || '',
      instructor_name: cls.instructor_name,
      scheduled_at: cls.scheduled_at
        ? local.toISOString().slice(0, 16)
        : '',
      duration_minutes: cls.duration_minutes || 60,
      is_premium: cls.is_premium,
      stream_url: cls.stream_url || '',
      thumbnail_url: cls.thumbnail_url || '',
    });
  } else {
    setEditingClass(null);
    setFormData({
      title: '',
      description: '',
      instructor_name: '',
      scheduled_at: '',
      duration_minutes: 60,
      is_premium: false,
      stream_url: '',
      thumbnail_url: '',
    });
  }

  setIsDialogOpen(true);
};
  const handleSubmit = async () => {
  if (!formData.title.trim() || !formData.instructor_name.trim() || !formData.scheduled_at) {
    toast.error('Title, instructor, and schedule are required');
    return;
  }

  const payload = {
    ...formData,
    scheduled_at: new Date(formData.scheduled_at).toISOString(),
  };

  if (editingClass) {
    const { error } = await supabase
      .from('live_sessions')
      // @ts-expect-error - Schema mismatch with actual DB
      .update(payload)
      .eq('id', editingClass.id);

    if (error) {
      toast.error('Failed to update class');
    } else {
      toast.success('Class updated successfully');
      setIsDialogOpen(false);
      fetchClasses();
    }
  } else {
    const { data: insertedData, error } = await supabase
      .from('live_sessions')
      // @ts-expect-error - Schema mismatch with actual DB
      .insert([payload])
      .select('id')
      .single() as { data: { id: string } | null; error: any };

    if (error) {
      toast.error('Failed to create class');
    } else {
      toast.success('Class created successfully');
      setIsDialogOpen(false);
      fetchClasses();

      // Send push notification to all users via notify-session-scheduled
      if (insertedData?.id) {
        supabase.functions.invoke('notify-session-scheduled', {
          body: { session_id: insertedData.id },
        }).then(({ data, error: notifError }) => {
          if (notifError) {
            console.error('Push notification error:', notifError);
            toast.error('Class created but failed to send notifications');
          } else {
            toast.success(`Push notifications sent to ${data?.notified || 0} users`);
          }
        });
      }
    }
  }
};

 
   const handleDelete = async (id: string) => {
     if (!confirm('Are you sure you want to delete this class?')) return;
 
     const { error } = await supabase.from('live_sessions').delete().eq('id', id);
 
     if (error) {
       toast.error('Failed to delete class');
     } else {
       toast.success('Class deleted successfully');
       fetchClasses();
     }
   };
 
   const isUpcoming = (date: string) => new Date(date) > new Date();
 
   return (
     <>
        <PageHeader title="Live Classes" description="Schedule and manage live yoga sessions">
          <PermissionGuard module="live_classes" action="create">
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Schedule Class
            </Button>
          </PermissionGuard>
        </PageHeader>
 
       <Card>
         <CardContent className="p-6">
           <div className="rounded-lg border">
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>Class</TableHead>
                   <TableHead>Instructor</TableHead>
                   <TableHead>Schedule</TableHead>
                   <TableHead>Type</TableHead>
                   <TableHead>Registrations</TableHead>
                   <TableHead className="text-right">Actions</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {isLoading ? (
                   <TableRow>
                     <TableCell colSpan={6} className="text-center py-8">
                       Loading classes...
                     </TableCell>
                   </TableRow>
                 ) : classes.length === 0 ? (
                   <TableRow>
                     <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                       No live classes found
                     </TableCell>
                   </TableRow>
                 ) : (
                   classes.map((cls) => (
                     <TableRow key={cls.id}>
                       <TableCell>
                         <div>
                           <p className="font-medium">{cls.title}</p>
                           <p className="text-sm text-muted-foreground truncate max-w-xs">
                             {cls.description || '-'}
                           </p>
                         </div>
                       </TableCell>
                       <TableCell>{cls.instructor_name}</TableCell>
                       <TableCell>
                         <div className="flex items-center gap-1 text-sm">
                           <Calendar className="w-3 h-3" />
                           {new Date(cls.scheduled_at).toLocaleDateString()}
                           <span className="text-muted-foreground">
                             {new Date(cls.scheduled_at).toLocaleTimeString([], {
                               hour: '2-digit',
                               minute: '2-digit',
                             })}
                           </span>
                         </div>
                         <Badge variant={isUpcoming(cls.scheduled_at) ? 'default' : 'secondary'} className="mt-1">
                           {isUpcoming(cls.scheduled_at) ? 'Upcoming' : 'Past'}
                         </Badge>
                       </TableCell>
                       <TableCell>
                         <Badge variant={cls.is_premium ? 'default' : 'outline'}>
                           {cls.is_premium ? 'Premium' : 'Free'}
                         </Badge>
                       </TableCell>
                       <TableCell>
                         <div className="flex items-center gap-1">
                           <Users className="w-4 h-4 text-muted-foreground" />
                           <span>{cls.max_participants || '∞'}</span>
                         </div>
                       </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <PermissionGuard module="live_classes" action="update">
                              <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(cls)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                            </PermissionGuard>
                            <PermissionGuard module="live_classes" action="delete">
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(cls.id)}>
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
 
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden">
            <DialogHeader className="px-6 pt-6 pb-4">
              <DialogTitle className="text-xl">
                {editingClass ? 'Edit Live Class' : 'Schedule New Class'}
              </DialogTitle>
              <DialogDescription>
                {editingClass 
                  ? 'Update the details of your live yoga session' 
                  : 'Fill in the details to schedule a new live yoga session'}
              </DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="max-h-[60vh]">
              <div className="px-6 pb-6 space-y-6">
                {/* Basic Info Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    Basic Information
                  </div>
                  
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">
                        Class Title <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="e.g., Morning Flow Yoga"
                        className="h-11"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Describe what participants will learn in this session..."
                        className="min-h-[100px] resize-none"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="instructor">
                        Instructor Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="instructor"
                        value={formData.instructor_name}
                        onChange={(e) => setFormData({ ...formData, instructor_name: e.target.value })}
                        placeholder="e.g., Sarah Johnson"
                        className="h-11"
                      />
                    </div>
                   </div>
                   
                   <div className="space-y-2">
                     <Label htmlFor="duration">Duration (minutes)</Label>
                     <Input
                       id="duration"
                       type="number"
                       min={1}
                       value={formData.duration_minutes}
                       onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 60 })}
                       placeholder="60"
                       className="h-11"
                     />
                   </div>
                 </div>
                <Separator />
                
                {/* Schedule Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    Schedule
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="scheduled">
                      Date & Time <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="scheduled"
                      type="datetime-local"
                      value={formData.scheduled_at}
                      onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                      className="h-11"
                    />
                  </div>
                </div>
                
                <Separator />
                
                {/* Media Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <ImageIcon className="w-4 h-4" />
                    Media & Streaming
                  </div>
                  
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label>Thumbnail Image</Label>
                      <FileUpload
                        bucket="thumbnails"
                        accept="image/jpeg,image/png,image/webp"
                        value={formData.thumbnail_url}
                        onChange={(url) => setFormData({ ...formData, thumbnail_url: url })}
                        label="Upload Thumbnail"
                        maxSizeMB={5}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="stream_url" className="flex items-center gap-2">
                        <Link2 className="w-3.5 h-3.5" />
                        Stream URL
                      </Label>
                      <Input
                        id="stream_url"
                        value={formData.stream_url}
                        onChange={(e) => setFormData({ ...formData, stream_url: e.target.value })}
                        placeholder="https://zoom.us/j/... or YouTube Live URL"
                        className="h-11"
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter the URL where users will join the live stream
                      </p>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                {/* Access Control Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Crown className="w-4 h-4" />
                    Access Control
                  </div>
                  
                  <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                    <div className="space-y-0.5">
                      <Label htmlFor="is_premium" className="text-base font-medium cursor-pointer">
                        Premium Class
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Only premium subscribers can access this class
                      </p>
                    </div>
                    <Switch
                      id="is_premium"
                      checked={formData.is_premium}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_premium: checked })}
                    />
                  </div>
                </div>
              </div>
            </ScrollArea>
            
            <DialogFooter className="px-6 py-4 border-t bg-muted/30">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} className="min-w-[120px]">
                {editingClass ? 'Save Changes' : 'Schedule Class'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
     </>
   );
 };
 
 export default LiveClassesPage;