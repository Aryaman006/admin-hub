import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { blogCmsApi } from "@/lib/blogCmsApi";
import PageHeader from "@/components/admin/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

interface BlogDetail {
  id: string;
  title: string;
  slug: string;
  description: string;
  content_markdown: string;
  hero_image_url: string;
  status: string;
  category: string;
  tags: string[];
}

const EditBlogPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [contentMarkdown, setContentMarkdown] = useState("");
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [isPublished, setIsPublished] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["blog", id],
    queryFn: () => blogCmsApi<{ blog: BlogDetail }>("GET", `/blogs/${id}`),
    enabled: !!id,
  });

  useEffect(() => {
    if (data?.blog) {
      const b = data.blog;
      setTitle(b.title || "");
      setSlug(b.slug || "");
      setDescription(b.description || "");
      setContentMarkdown(b.content_markdown || "");
      setHeroImageUrl(b.hero_image_url || "");
      setCategory(b.category || "");
      setTags(Array.isArray(b.tags) ? b.tags.join(", ") : "");
      setIsPublished(b.status === "published");
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      blogCmsApi("PATCH", `/blogs/${id}`, {
        title,
        slug,
        description,
        content_markdown: contentMarkdown,
        hero_image_url: heroImageUrl,
        category,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        status: isPublished ? "published" : "draft",
      }),
    onSuccess: () => {
      toast.success("Blog updated");
      queryClient.invalidateQueries({ queryKey: ["blogs"] });
      queryClient.invalidateQueries({ queryKey: ["blog", id] });
      navigate("/blogs");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Edit Blog" description="Update blog post details" />

      <div className="grid gap-6 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Blog Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[80px]" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Yoga, Wellness" />
            </div>
            <div className="space-y-2">
              <Label>Tags (comma-separated)</Label>
              <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="yoga, meditation, health" />
            </div>
            <div className="space-y-2">
              <Label>Hero Image URL</Label>
              <Input value={heroImageUrl} onChange={(e) => setHeroImageUrl(e.target.value)} placeholder="https://..." />
              {heroImageUrl && <img src={heroImageUrl} alt="Hero" className="w-full h-40 object-cover rounded-lg mt-2" />}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Content (Markdown)</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea value={contentMarkdown} onChange={(e) => setContentMarkdown(e.target.value)} className="min-h-[300px] font-mono text-sm" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <Label>Published</Label>
                <p className="text-xs text-muted-foreground">Toggle to publish or unpublish this blog</p>
              </div>
              <Switch checked={isPublished} onCheckedChange={setIsPublished} />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate("/blogs")}>Cancel</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditBlogPage;
