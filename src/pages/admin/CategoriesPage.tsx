import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/contexts/PermissionsContext';
import PermissionGuard from '@/components/admin/PermissionGuard';

import PageHeader from '@/components/admin/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, Star } from 'lucide-react';
import { toast } from 'sonner';
import CategoryForm from '@/components/admin/CategoryForm';
import { seedCategories } from '@/utils/seedCategories';
 
 interface Category {
   id: string;
   name: string;
   description: string | null;
   thumbnail_url: string | null;
   is_featured: boolean;
 }
 
 const CategoriesPage = () => {
   const [categories, setCategories] = useState<Category[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [isDialogOpen, setIsDialogOpen] = useState(false);
   const [editingCategory, setEditingCategory] = useState<Category | null>(null);
   const [isSeeding, setIsSeeding] = useState(false);
 
   useEffect(() => {
     fetchCategories();
   }, []);
 
   const fetchCategories = async () => {
     setIsLoading(true);
     const { data, error } = await supabase
       .from('categories')
       .select('*')
       .order('created_at', { ascending: false });
 
     if (error) {
       toast.error('Failed to fetch categories');
     } else {
       setCategories(data || []);
     }
     setIsLoading(false);
   };
 
   const handleOpenDialog = (category?: Category) => {
     setEditingCategory(category || null);
     setIsDialogOpen(true);
   };
 
   const handleSeedCategories = async () => {
     setIsSeeding(true);
     try {
       const result = await seedCategories();
       toast.success(result.message);
       fetchCategories();
     } catch (error: any) {
       toast.error(error.message || 'Failed to seed categories');
     } finally {
       setIsSeeding(false);
     }
   };
 
   const handleDelete = async (id: string) => {
     if (!confirm('Are you sure you want to delete this category?')) return;
 
     const { error } = await supabase.from('categories').delete().eq('id', id);
 
     if (error) {
       toast.error('Failed to delete category');
     } else {
       toast.success('Category deleted successfully');
       fetchCategories();
     }
   };
 
   return (
     <>
         <PageHeader
           title="Categories"
           description="Manage video categories"
         >
           <PermissionGuard module="categories" action="create">
             <Button onClick={() => handleOpenDialog()}>
               <Plus className="w-4 h-4 mr-2" />
               Add Category
             </Button>
           </PermissionGuard>
         </PageHeader>
 
       <Card>
         <CardContent className="p-6">
           <div className="rounded-lg border">
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>Thumbnail</TableHead>
                   <TableHead>Name</TableHead>
                   <TableHead>Featured</TableHead>
                   <TableHead className="text-right">Actions</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {isLoading ? (
                   <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                       Loading categories...
                     </TableCell>
                   </TableRow>
                 ) : categories.length === 0 ? (
                   <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                       No categories found
                     </TableCell>
                   </TableRow>
                 ) : (
                   categories.map((category) => (
                     <TableRow key={category.id}>
                       <TableCell>
                         {category.thumbnail_url ? (
                           <img
                             src={category.thumbnail_url}
                             alt={category.name}
                             className="w-12 h-12 rounded-lg object-cover"
                           />
                         ) : (
                           <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                             <span className="text-xs text-muted-foreground">No img</span>
                           </div>
                         )}
                       </TableCell>
                       <TableCell className="font-medium">{category.name}</TableCell>
                       <TableCell>
                         {category.is_featured && (
                           <Star className="w-4 h-4 text-primary fill-primary" />
                         )}
                       </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <PermissionGuard module="categories" action="update">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenDialog(category)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            </PermissionGuard>
                            <PermissionGuard module="categories" action="delete">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(category.id)}
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
 
       <CategoryForm
         open={isDialogOpen}
         onOpenChange={setIsDialogOpen}
         category={editingCategory}
         onSuccess={fetchCategories}
       />
     </>
   );
 };
 
 export default CategoriesPage;