import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import FileUpload from './FileUpload';
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  is_featured: boolean;
}

interface CategoryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null;
  onSuccess: () => void;
}

const CategoryForm = ({ open, onOpenChange, category, onSuccess }: CategoryFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    thumbnail_url: '',
    is_featured: false,
  });

  // Sync form data when dialog opens or category changes
  useEffect(() => {
    if (open && category) {
      setFormData({
        name: category.name,
        thumbnail_url: category.thumbnail_url || '',
        is_featured: category.is_featured,
      });
    } else if (open && !category) {
      setFormData({
        name: '',
        thumbnail_url: '',
        is_featured: false,
      });
    }
  }, [open, category]);
 
   const handleSubmit = async () => {
     if (!formData.name.trim()) {
       toast.error('Category name is required');
       return;
     }
 
     setIsSubmitting(true);
 
     try {
       if (category) {
         const { error } = await supabase
           .from('categories')
           // @ts-expect-error - Schema mismatch with actual DB
           .update(formData)
           .eq('id', category.id);
 
         if (error) throw error;
         toast.success('Category updated successfully');
       } else {
         // @ts-expect-error - Schema mismatch with actual DB
         const { error } = await supabase.from('categories').insert([formData]);
         if (error) throw error;
         toast.success('Category created successfully');
       }
 
       onOpenChange(false);
       onSuccess();
     } catch (error: any) {
       toast.error(error.message || 'Failed to save category');
     } finally {
       setIsSubmitting(false);
     }
   };
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="max-w-md">
         <DialogHeader>
           <DialogTitle>{category ? 'Edit Category' : 'Add Category'}</DialogTitle>
         </DialogHeader>
         <div className="space-y-4">
           <div className="space-y-2">
             <Label htmlFor="name">Name</Label>
             <Input
               id="name"
               value={formData.name}
               onChange={(e) => setFormData({ ...formData, name: e.target.value })}
               placeholder="Category name"
             />
           </div>
 
           <div className="space-y-2">
             <Label>Thumbnail</Label>
             <FileUpload
               bucket="thumbnails"
               accept="image/jpeg,image/png,image/webp,image/gif"
               value={formData.thumbnail_url}
               onChange={(url) => setFormData({ ...formData, thumbnail_url: url })}
               label="Upload Thumbnail"
             />
           </div>
 
           <div className="flex items-center justify-between">
             <Label htmlFor="featured">Featured Category</Label>
             <Switch
               id="featured"
               checked={formData.is_featured}
               onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
             />
           </div>
         </div>
         <DialogFooter>
           <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
             Cancel
           </Button>
           <Button onClick={handleSubmit} disabled={isSubmitting}>
             {isSubmitting ? 'Saving...' : category ? 'Update' : 'Create'}
           </Button>
         </DialogFooter>
       </DialogContent>
     </Dialog>
   );
 };
 
 export default CategoryForm;