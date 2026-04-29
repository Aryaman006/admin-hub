 import { useState, useEffect } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
 import { Switch } from '@/components/ui/switch';
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from '@/components/ui/select';
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogFooter,
 } from '@/components/ui/dialog';
 import FileUpload from './FileUpload';
 import { toast } from 'sonner';
 import { removeUploadedObject, type UploadBucket, type UploadResult } from '@/utils/uploadUtils';
 
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
  }
 
 interface Category {
   id: string;
   name: string;
 }
 
 interface VideoFormProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   video?: Video | null;
   categories: Category[];
   onSuccess: () => void;
 }
 
 const VideoForm = ({ open, onOpenChange, video, categories, onSuccess }: VideoFormProps) => {
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [uploadingFields, setUploadingFields] = useState<Record<string, boolean>>({});
   const [newUploads, setNewUploads] = useState<Array<{ bucket: UploadBucket; path: string }>>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category_id: '',
    is_premium: false,
    duration_seconds: 0,
    yogic_points: 0,
    thumbnail_url: '',
    video_url: '',
    is_published: true,
  });
 
   useEffect(() => {
     if (open && video) {
       setNewUploads([]);
       setUploadingFields({});
       setFormData({
         title: video.title,
        description: video.description || '',
         category_id: video.category_id || '',
         is_premium: video.is_premium,
        duration_seconds: video.duration_seconds || 0,
         yogic_points: video.yogic_points || 0,
         thumbnail_url: video.thumbnail_url || '',
         video_url: video.video_url || '',
         is_published: video.is_published,
       });
     } else if (open && !video) {
       setNewUploads([]);
       setUploadingFields({});
       setFormData({
         title: '',
        description: '',
         category_id: '',
         is_premium: false,
        duration_seconds: 0,
         yogic_points: 0,
         thumbnail_url: '',
         video_url: '',
         is_published: true,
       });
     }
   }, [open, video]);

   const isUploading = Object.values(uploadingFields).some(Boolean);

   const setUploadState = (field: string) => (uploading: boolean) => {
     setUploadingFields((prev) => ({ ...prev, [field]: uploading }));
   };

   const handleDialogOpenChange = (nextOpen: boolean) => {
     if (!nextOpen && isUploading) {
       toast.warning('Please wait for the upload to finish or cancel it before closing.');
       return;
     }
     onOpenChange(nextOpen);
   };

   const trackUpload = (bucket: UploadBucket) => (result: UploadResult) => {
     setNewUploads((prev) => [...prev, { bucket, path: result.path }]);
   };

   const cleanupNewUploads = async (reason: string) => {
     if (newUploads.length === 0) return;
     const uploadsToRemove = newUploads;

     await Promise.allSettled(
       uploadsToRemove.map((upload) => removeUploadedObject(upload.bucket, upload.path, reason))
     );
     setFormData((prev) => ({
       ...prev,
       thumbnail_url: uploadsToRemove.some((upload) => upload.bucket === 'thumbnails' && prev.thumbnail_url.includes(upload.path)) ? '' : prev.thumbnail_url,
       video_url: uploadsToRemove.some((upload) => upload.bucket === 'videos' && prev.video_url.includes(upload.path)) ? '' : prev.video_url,
     }));
     setNewUploads([]);
   };
 
   const handleSubmit = async () => {
    if (isSubmitting) return;

    if (isUploading) {
      toast.error('Upload is still in progress. Please wait before saving.');
      return;
    }

    if (!formData.title.trim()) {
      toast.error('Video title is required');
      return;
    }

    if (!formData.video_url) {
      toast.error('Video file is required. Please upload a video before saving.');
      return;
    }
 
     setIsSubmitting(true);
 
     const payload = {
       ...formData,
       category_id: formData.category_id || null,
     };
 
     try {
       if (video) {
         const { error } = await supabase
           .from('videos')
           // @ts-expect-error - Schema mismatch with actual DB
           .update(payload)
           .eq('id', video.id);
 
         if (error) {
           console.error('[video-save:failure]', { action: 'update', videoId: video.id, payload, error });
           throw error;
         }
         console.info('[video-save:success]', { action: 'update', videoId: video.id });
         toast.success('Video updated successfully');
       } else {
         // @ts-expect-error - Schema mismatch with actual DB
         const { error } = await supabase.from('videos').insert([payload]);
         if (error) {
           console.error('[video-save:failure]', { action: 'insert', payload, error });
           throw error;
         }
         console.info('[video-save:success]', { action: 'insert', title: payload.title });
         toast.success('Video created successfully');
       }
 
       setNewUploads([]);
       onOpenChange(false);
       onSuccess();
     } catch (error: unknown) {
       console.error('[video-save:failure:handled]', { payload, error });
       await cleanupNewUploads('video-db-save-failed');
       toast.error(error instanceof Error ? error.message : 'Failed to save video. The uploaded file was cleaned up; please try again.');
     } finally {
       setIsSubmitting(false);
     }
   };
 
   return (
     <Dialog open={open} onOpenChange={handleDialogOpenChange}>
       <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
         <DialogHeader>
           <DialogTitle>{video ? 'Edit Video' : 'Add Video'}</DialogTitle>
         </DialogHeader>
         <div className="grid grid-cols-2 gap-4">
           <div className="col-span-2 space-y-2">
             <Label htmlFor="title">Title</Label>
             <Input
               id="title"
               value={formData.title}
               onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Video title"
             />
           </div>
 
          <div className="col-span-2 space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Video description"
            />
          </div>

           <div className="space-y-2">
             <Label>Category</Label>
             <Select
               value={formData.category_id}
               onValueChange={(value) => setFormData({ ...formData, category_id: value })}
             >
               <SelectTrigger>
                 <SelectValue placeholder="Select category" />
               </SelectTrigger>
               <SelectContent>
                 {categories.map((cat) => (
                   <SelectItem key={cat.id} value={cat.id}>
                     {cat.name}
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
          </div>

           <div className="space-y-2">
             <Label htmlFor="yogic_points">Yogic Points</Label>
             <Input
               id="yogic_points"
               type="number"
               value={formData.yogic_points}
               onChange={(e) => setFormData({ ...formData, yogic_points: parseInt(e.target.value) || 0 })}
             />
           </div>
 
           <div className="flex items-center justify-between pt-6">
             <Label htmlFor="is_premium">Premium Content</Label>
             <Switch
               id="is_premium"
               checked={formData.is_premium}
               onCheckedChange={(checked) => setFormData({ ...formData, is_premium: checked })}
             />
           </div>
 
           <div className="col-span-2 space-y-2">
             <Label>Thumbnail</Label>
             <FileUpload
               bucket="thumbnails"
               accept="image/jpeg,image/png,image/webp,image/gif"
               value={formData.thumbnail_url}
               onChange={(url) => setFormData({ ...formData, thumbnail_url: url })}
               onUploadStateChange={setUploadState('thumbnail')}
               onUploadComplete={trackUpload('thumbnails')}
               label="Upload Thumbnail"
             />
           </div>
 
           <div className="col-span-2 space-y-2">
             <Label>Video File</Label>
             <FileUpload
               bucket="videos"
               accept="video/mp4,video/webm,video/quicktime"
               value={formData.video_url}
               onChange={(url) => setFormData((prev) => ({ ...prev, video_url: url }))}
               onUploadStateChange={setUploadState('video')}
               onUploadComplete={trackUpload('videos')}
               onDurationDetected={(duration) => setFormData((prev) => ({ ...prev, duration_seconds: duration }))}
               label="Upload Video"
               maxSizeMB={500}
             />
           </div>

            {formData.duration_seconds > 0 && (
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">
                  Duration: {Math.floor(formData.duration_seconds / 60)}m {formData.duration_seconds % 60}s (auto-detected)
                </p>
              </div>
            )}
 
           <div className="col-span-2 flex items-center justify-between">
             <Label htmlFor="is_published">Published</Label>
             <Switch
               id="is_published"
               checked={formData.is_published}
               onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
             />
           </div>
         </div>
         <DialogFooter>
           <Button variant="outline" onClick={() => handleDialogOpenChange(false)} disabled={isSubmitting || isUploading}>
             Cancel
           </Button>
           <Button onClick={handleSubmit} disabled={isSubmitting || isUploading}>
             {isUploading ? 'Uploading...' : isSubmitting ? 'Saving...' : video ? 'Update' : 'Create'}
           </Button>
         </DialogFooter>
       </DialogContent>
     </Dialog>
   );
 };
 
 export default VideoForm;
