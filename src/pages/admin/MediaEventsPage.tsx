import { useState } from 'react';
import PermissionGuard from '@/components/admin/PermissionGuard';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import PageHeader from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Trash2, Pencil, Image as ImageIcon, Loader2 } from 'lucide-react';
import FileUpload from '@/components/admin/FileUpload';
import { removeUploadedObject, type UploadBucket, type UploadResult } from '@/utils/uploadUtils';

interface MediaEvent {
  id: string;
  description: string | null;
  image_url: string | null;
  video_url: string | null;
  created_at: string;
}

const MediaEventsPage = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MediaEvent | null>(null);
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingFields, setUploadingFields] = useState<Record<string, boolean>>({});
  const [newUploads, setNewUploads] = useState<Array<{ bucket: UploadBucket; path: string }>>([]);

  const isUploading = Object.values(uploadingFields).some(Boolean);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['media-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('media_events')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as MediaEvent[];
    },
  });

  const resetForm = () => {
    setDescription('');
    setImageUrl('');
    setVideoUrl('');
    setEditingItem(null);
    setUploadingFields({});
    setNewUploads([]);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (item: MediaEvent) => {
    setNewUploads([]);
    setUploadingFields({});
    setEditingItem(item);
    setDescription(item.description || '');
    setImageUrl(item.image_url || '');
    setVideoUrl(item.video_url || '');
    setDialogOpen(true);
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open && isUploading) {
      toast.warning('Please wait for the upload to finish or cancel it before closing.');
      return;
    }
    setDialogOpen(open);
    if (!open) resetForm();
  };

  const setUploadState = (field: string) => (uploading: boolean) => {
    setUploadingFields((prev) => ({ ...prev, [field]: uploading }));
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
    if (uploadsToRemove.some((upload) => upload.bucket === 'thumbnails' && imageUrl.includes(upload.path))) {
      setImageUrl('');
    }
    if (uploadsToRemove.some((upload) => upload.bucket === 'videos' && videoUrl.includes(upload.path))) {
      setVideoUrl('');
    }
    setNewUploads([]);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isUploading) {
        throw new Error('Upload is still in progress. Please wait before saving.');
      }

      setSaving(true);
      const payload = {
        description,
        image_url: imageUrl || null,
        video_url: videoUrl || null,
      };

      if (editingItem) {
        const { error } = await supabase
          .from('media_events')
          // @ts-expect-error - media_events exists in production but is missing from generated Supabase types
          .update(payload)
          .eq('id', editingItem.id);
        if (error) {
          console.error('[media-event-save:failure]', { action: 'update', id: editingItem.id, payload, error });
          throw error;
        }
        console.info('[media-event-save:success]', { action: 'update', id: editingItem.id });
      } else {
        const { error } = await supabase
          .from('media_events')
          // @ts-expect-error - media_events exists in production but is missing from generated Supabase types
          .insert(payload);
        if (error) {
          console.error('[media-event-save:failure]', { action: 'insert', payload, error });
          throw error;
        }
        console.info('[media-event-save:success]', { action: 'insert' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-events'] });
      toast.success(editingItem ? 'Updated successfully' : 'Created successfully');
      setDialogOpen(false);
      resetForm();
      setSaving(false);
    },
    onError: async (err: unknown) => {
      console.error('Media event save error:', err);
      await cleanupNewUploads('media-event-db-save-failed');
      toast.error(err instanceof Error ? err.message : 'Failed to save media event. Uploaded files were cleaned up; please try again.');
      setSaving(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('media_events').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-events'] });
      toast.success('Deleted successfully');
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Failed to delete media event'),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Media & Events" description="Manage images, videos, and descriptions">
        <PermissionGuard module="media_events" action="create">
          <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}>
                <Plus className="w-4 h-4 mr-2" /> Add New
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingItem ? 'Edit' : 'Add'} Media & Event</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
                </div>
                <div className="space-y-2">
                  <Label>Image</Label>
                  <FileUpload
                    bucket="thumbnails"
                    accept="image/*"
                    value={imageUrl}
                    onChange={setImageUrl}
                    onUploadStateChange={setUploadState('image')}
                    onUploadComplete={trackUpload('thumbnails')}
                    label="Upload Image"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Video</Label>
                  <FileUpload
                    bucket="videos"
                    accept="video/*"
                    value={videoUrl}
                    onChange={setVideoUrl}
                    onUploadStateChange={setUploadState('video')}
                    onUploadComplete={trackUpload('videos')}
                    label="Upload Video"
                  />
                </div>
                <Button type="submit" disabled={saving || isUploading || (!description && !imageUrl && !videoUrl)} className="w-full">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {isUploading ? 'Uploading...' : editingItem ? 'Update' : 'Create'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </PermissionGuard>
      </PageHeader>



      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No media & events yet. Add your first one!</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              {item.video_url ? (
                <video src={item.video_url} controls className="w-full h-48 object-cover bg-black" />
              ) : item.image_url ? (
                <img src={item.image_url} alt="" className="w-full h-48 object-cover" />
              ) : (
                <div className="w-full h-48 bg-muted flex items-center justify-center">
                  <ImageIcon className="w-12 h-12 text-muted-foreground/40" />
                </div>
              )}
              <div className="p-4 space-y-2">
                {item.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3">{item.description}</p>
                )}
                <div className="flex gap-2 pt-2">
                  <PermissionGuard module="media_events" action="update">
                    <Button size="sm" variant="outline" onClick={() => openEdit(item)}>
                      <Pencil className="w-3 h-3 mr-1" /> Edit
                    </Button>
                  </PermissionGuard>
                  <PermissionGuard module="media_events" action="delete">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => deleteMutation.mutate(item.id)}
                    >
                      <Trash2 className="w-3 h-3 mr-1" /> Delete
                    </Button>
                  </PermissionGuard>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MediaEventsPage;
