import { useState } from "react";
import PermissionGuard from '@/components/admin/PermissionGuard';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { blogCmsApi } from "@/lib/blogCmsApi";
import PageHeader from "@/components/admin/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye, EyeOff, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface Blog {
  id: string;
  title: string;
  slug: string;
  status: string;
  category: string;
  published_at: string | null;
  created_at: string;
  hero_image_url: string | null;
}

const BlogListPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["blogs"],
    queryFn: () => blogCmsApi<{ blogs: Blog[] }>("GET", "/blogs"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => blogCmsApi("DELETE", `/blogs/${id}`),
    onSuccess: () => {
      toast.success("Blog deleted");
      queryClient.invalidateQueries({ queryKey: ["blogs"] });
      setDeleteId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      blogCmsApi("PATCH", `/blogs/${id}`, { status: status === "published" ? "draft" : "published" }),
    onSuccess: () => {
      toast.success("Status updated");
      queryClient.invalidateQueries({ queryKey: ["blogs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const blogs = data?.blogs ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Blog Management" description="Manage blog posts via external CMS">
        <PermissionGuard module="blogs" action="create">
          <Button onClick={() => navigate("/blogs/create")}>
            <Plus className="w-4 h-4 mr-2" /> Create Blog
          </Button>
        </PermissionGuard>
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : blogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No blogs found. Create your first blog post.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blogs.map((blog) => (
                  <TableRow key={blog.id}>
                    <TableCell className="font-medium max-w-[250px] truncate">{blog.title}</TableCell>
                    <TableCell>
                      <Badge variant={blog.status === "published" ? "default" : "secondary"}>
                        {blog.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{blog.category || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {blog.published_at
                        ? format(new Date(blog.published_at), "MMM d, yyyy")
                        : blog.created_at
                          ? format(new Date(blog.created_at), "MMM d, yyyy")
                          : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <PermissionGuard module="blogs" action="update">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleMutation.mutate({ id: blog.id, status: blog.status })}
                            title={blog.status === "published" ? "Unpublish" : "Publish"}
                          >
                            {blog.status === "published" ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </PermissionGuard>
                        <PermissionGuard module="blogs" action="update">
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/blogs/edit/${blog.id}`)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </PermissionGuard>
                        <PermissionGuard module="blogs" action="delete">
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(blog.id)} className="text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </PermissionGuard>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Blog</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. The blog post will be permanently deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BlogListPage;
