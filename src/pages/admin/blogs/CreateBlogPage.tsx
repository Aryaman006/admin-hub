import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { blogCmsApi, uploadBlogImage } from "@/lib/blogCmsApi";
import PageHeader from "@/components/admin/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Upload, X, ImagePlus, Sparkles } from "lucide-react";

const CreateBlogPage = () => {
  const navigate = useNavigate();
  const heroInputRef = useRef<HTMLInputElement>(null);
  const contentInputRef = useRef<HTMLInputElement>(null);

  const [authorName, setAuthorName] = useState("");
  const [authorDesignation, setAuthorDesignation] = useState("");
  const [rawText, setRawText] = useState("");
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [heroPreview, setHeroPreview] = useState<string | null>(null);
  const [contentFiles, setContentFiles] = useState<File[]>([]);
  const [contentPreviews, setContentPreviews] = useState<string[]>([]);

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!authorName.trim()) {
        throw new Error("Author name is required");
      }
      if (!rawText.trim() || rawText.trim().length < 20) {
        throw new Error("Raw text must be at least 20 characters");
      }

      let heroImageUrl: string | undefined;
      if (heroFile) {
        heroImageUrl = await uploadBlogImage(heroFile, "hero-images");
      }

      const contentImageUrls: string[] = [];
      for (const file of contentFiles) {
        const url = await uploadBlogImage(file, "content-images");
        contentImageUrls.push(url);
      }

      return blogCmsApi("POST", "/generate", {
        rawText,
        authorName,
        authorDesignation,
        heroImageUrl,
        contentImageUrls,
      });
    },
    onSuccess: () => {
      toast.success("Blog generated and published successfully!");
      navigate("/blogs");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleHeroSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setHeroFile(file);
      setHeroPreview(URL.createObjectURL(file));
    }
  };

  const handleContentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setContentFiles((prev) => [...prev, ...files]);
    setContentPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
  };

  const removeContentImage = (index: number) => {
    setContentFiles((prev) => prev.filter((_, i) => i !== index));
    setContentPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Create Blog" description="AI-generate a blog post from raw text" />

      <div className="grid gap-6 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Author Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Author Name *</Label>
              <Input value={authorName} onChange={(e) => setAuthorName(e.target.value)} placeholder="John Doe" />
            </div>
            <div className="space-y-2">
              <Label>Author Designation</Label>
              <Input value={authorDesignation} onChange={(e) => setAuthorDesignation(e.target.value)} placeholder="Yoga Instructor" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Hero Image</CardTitle>
          </CardHeader>
          <CardContent>
            <input ref={heroInputRef} type="file" accept="image/*" className="hidden" onChange={handleHeroSelect} />
            {heroPreview ? (
              <div className="relative">
                <img src={heroPreview} alt="Hero" className="w-full h-48 object-cover rounded-lg" />
                <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => { setHeroFile(null); setHeroPreview(null); }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <button onClick={() => heroInputRef.current?.click()} className="w-full h-48 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors">
                <Upload className="w-8 h-8" />
                <span className="text-sm">Click to upload hero image</span>
              </button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Content Images</CardTitle>
          </CardHeader>
          <CardContent>
            <input ref={contentInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleContentSelect} />
            {contentPreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                {contentPreviews.map((url, i) => (
                  <div key={i} className="relative aspect-square">
                    <img src={url} alt={`Content ${i + 1}`} className="w-full h-full object-cover rounded-lg" />
                    <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => removeContentImage(i)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <Button variant="outline" onClick={() => contentInputRef.current?.click()} className="w-full">
              <ImagePlus className="w-4 h-4 mr-2" /> Add Content Images
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Raw Text Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste your raw blog content here. The AI will format it into a publishable blog post..."
              className="min-h-[200px]"
            />
            <p className="text-xs text-muted-foreground">The AI will transform this text into a structured, formatted blog post with proper headings and sections.</p>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate("/blogs")}>Cancel</Button>
          <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
            {generateMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            Generate & Publish
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateBlogPage;
