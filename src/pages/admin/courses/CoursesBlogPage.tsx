import { useEffect, useState } from 'react';
import PermissionGuard from '@/components/admin/PermissionGuard';
import { supabase } from '@/integrations/supabase/client';
import PageHeader from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Search, Upload, Sparkles, Loader2, Eye, CreditCard, X, Clock, ListChecks } from 'lucide-react';

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  author_name: string | null;
  featured_image: string | null;
  content_raw: string | null;
  content_formatted: string | null;
  published: boolean;
  created_at: string;
  price_inr: number | null;
  price_usd: number | null;
  price_eur: number | null;
  price_gbp: number | null;
  enable_payment: boolean;
  payment_title: string | null;
  features: string[] | null;
  duration: string | null;
}

const slugify = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const emptyForm = () => ({
  title: '',
  slug: '',
  description: '',
  author_name: '',
  featured_image: '',
  content_raw: '',
  content_formatted: '',
  published: false,
  price_inr: '',
  price_usd: '',
  price_eur: '',
  price_gbp: '',
  enable_payment: false,
  payment_title: '',
  features: [] as string[],
  duration: '',
});

const CoursesBlogPage = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [editing, setEditing] = useState<Course | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [newFeature, setNewFeature] = useState('');
  const { toast } = useToast();

  useEffect(() => { fetchCourses(); }, []);

  const fetchCourses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('courses')
      .select('id, title, slug, description, author_name, featured_image, content_raw, content_formatted, published, created_at, price_inr, price_usd, price_eur, price_gbp, enable_payment, payment_title, features, duration')
      .order('created_at', { ascending: false });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else setCourses((data as any[]) || []);
    setLoading(false);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setHeroFile(null);
    setNewFeature('');
    setDialogOpen(true);
  };

  const openEdit = (course: Course) => {
    setEditing(course);
    setForm({
      title: course.title || '',
      slug: course.slug || '',
      description: course.description || '',
      author_name: course.author_name || '',
      featured_image: course.featured_image || '',
      content_raw: course.content_raw || '',
      content_formatted: course.content_formatted || '',
      published: course.published || false,
      price_inr: course.price_inr?.toString() || '',
      price_usd: course.price_usd?.toString() || '',
      price_eur: course.price_eur?.toString() || '',
      price_gbp: course.price_gbp?.toString() || '',
      enable_payment: course.enable_payment || false,
      payment_title: course.payment_title || '',
      features: course.features || [],
      duration: course.duration || '',
    });
    setHeroFile(null);
    setNewFeature('');
    setDialogOpen(true);
  };

  const updateForm = (key: string, value: any) => {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      if (key === 'title' && !editing) next.slug = slugify(value);
      return next;
    });
  };

  const addFeature = () => {
    const trimmed = newFeature.trim();
    if (!trimmed) return;
    setForm(prev => ({ ...prev, features: [...prev.features, trimmed] }));
    setNewFeature('');
  };

  const removeFeature = (index: number) => {
    setForm(prev => ({ ...prev, features: prev.features.filter((_, i) => i !== index) }));
  };

  const uploadFile = async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop();
    const path = `course-heroes/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('thumbnails').upload(path, file);
    if (error) throw error;
    return supabase.storage.from('thumbnails').getPublicUrl(path).data.publicUrl;
  };

  const handleEnhance = async () => {
    if (!form.content_raw?.trim()) {
      toast({ title: 'Write some content first', variant: 'destructive' });
      return;
    }
    setEnhancing(true);
    try {
      const { data, error } = await supabase.functions.invoke('course-ai-generate', {
        body: { type: 'enhance', content: form.content_raw, title: form.title },
      });
      if (error) throw error;
      if (data?.content_formatted) {
        setForm(prev => ({ ...prev, content_formatted: data.content_formatted }));
        toast({ title: 'Content enhanced successfully!' });
      } else {
        throw new Error('No formatted content returned');
      }
    } catch (err: any) {
      toast({ title: 'AI Error', description: err.message, variant: 'destructive' });
    } finally {
      setEnhancing(false);
    }
  };

  const handleSave = async () => {
    if (!form.title?.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' });
      return;
    }
    if (form.enable_payment) {
      const hasPrice = [form.price_inr, form.price_usd, form.price_eur, form.price_gbp].some(p => p && parseFloat(p) > 0);
      if (!hasPrice) {
        toast({ title: 'At least one price is required when payment is enabled', variant: 'destructive' });
        return;
      }
    }
    setSaving(true);
    try {
      let heroImage = form.featured_image || null;
      if (heroFile) heroImage = await uploadFile(heroFile);

      const payload: any = {
        title: form.title.trim(),
        slug: form.slug || slugify(form.title),
        description: form.description?.trim() || null,
        author_name: form.author_name?.trim() || null,
        featured_image: heroImage,
        content_raw: form.content_raw || null,
        content_formatted: form.content_formatted || null,
        published: form.published,
        price_inr: form.price_inr ? parseFloat(form.price_inr) : null,
        price_usd: form.price_usd ? parseFloat(form.price_usd) : null,
        price_eur: form.price_eur ? parseFloat(form.price_eur) : null,
        price_gbp: form.price_gbp ? parseFloat(form.price_gbp) : null,
        enable_payment: form.enable_payment,
        payment_title: form.payment_title?.trim() || form.title.trim(),
        features: form.features.length > 0 ? form.features : null,
        duration: form.duration?.trim() || null,
      };

      if (editing) {
        payload.updated_at = new Date().toISOString();
        const { error } = await (supabase.from('courses') as any).update(payload).eq('id', editing.id);
        if (error) throw error;
        toast({ title: 'Course updated' });
      } else {
        const { error } = await (supabase.from('courses') as any).insert(payload);
        if (error) throw error;
        toast({ title: 'Course created' });
      }
      setDialogOpen(false);
      fetchCourses();
    } catch (err: any) {
      console.error('Course save error:', err);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this course?')) return;
    const { error } = await supabase.from('courses').delete().eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Course deleted' }); fetchCourses(); }
  };

  const filtered = courses.filter(b => b.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <PageHeader title="Courses" description="Create and manage courses with pricing and content">
        <PermissionGuard module="courses_blog" action="create">
          <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> New Course</Button>
        </PermissionGuard>
      </PageHeader>

      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search courses..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Pricing</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-28">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No courses found</TableCell></TableRow>
                ) : filtered.map(course => (
                  <TableRow key={course.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {course.featured_image && (
                          <img src={course.featured_image} alt="" className="h-10 w-14 rounded object-cover" />
                        )}
                        <div>
                          <p className="font-medium">{course.title}</p>
                          <p className="text-xs text-muted-foreground">/{course.slug}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{course.duration || '—'}</TableCell>
                    <TableCell>
                      {course.enable_payment ? (
                        <span className="text-sm">
                          {course.price_inr ? `₹${course.price_inr}` : course.price_usd ? `$${course.price_usd}` : '—'}
                        </span>
                      ) : (
                        <Badge variant="secondary">Free</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={course.published ? 'default' : 'secondary'}>
                        {course.published ? 'Published' : 'Draft'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(course.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <PermissionGuard module="courses_blog" action="update">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(course)}><Pencil className="h-4 w-4" /></Button>
                        </PermissionGuard>
                        <PermissionGuard module="courses_blog" action="delete">
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(course.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>{editing ? 'Edit' : 'Create'} Course</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-80px)] px-6 pb-6">
            <div className="space-y-5 py-4">
              {/* Title & Slug */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Title *</Label>
                  <Input value={form.title} onChange={e => updateForm('title', e.target.value)} placeholder="Course title" />
                </div>
                <div>
                  <Label>Slug</Label>
                  <Input value={form.slug} onChange={e => updateForm('slug', e.target.value)} placeholder="auto-generated" />
                </div>
              </div>

              {/* Description */}
              <div>
                <Label>Description *</Label>
                <Textarea
                  value={form.description}
                  onChange={e => updateForm('description', e.target.value)}
                  placeholder="Brief course description shown to users..."
                  rows={3}
                />
              </div>

              {/* Duration & Author */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Duration</Label>
                  <Input value={form.duration} onChange={e => updateForm('duration', e.target.value)} placeholder="e.g. 4 weeks, 3 months" />
                </div>
                <div>
                  <Label>Author / Instructor</Label>
                  <Input value={form.author_name} onChange={e => updateForm('author_name', e.target.value)} placeholder="Instructor name" />
                </div>
              </div>

              {/* Features */}
              <div className="border border-input rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-base font-semibold">Course Features</Label>
                </div>
                <p className="text-xs text-muted-foreground">Add key benefits or features of this course</p>
                
                {form.features.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {form.features.map((feature, i) => (
                      <Badge key={i} variant="secondary" className="gap-1 pr-1">
                        {feature}
                        <button onClick={() => removeFeature(i)} className="ml-1 hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Input
                    value={newFeature}
                    onChange={e => setNewFeature(e.target.value)}
                    placeholder="e.g. Certificate included, Lifetime access..."
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFeature(); } }}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addFeature} disabled={!newFeature.trim()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Thumbnail Upload */}
              <div>
                <Label>Thumbnail Image *</Label>
                <div className="mt-1 space-y-2">
                  {(heroFile || form.featured_image) && (
                    <img
                      src={heroFile ? URL.createObjectURL(heroFile) : form.featured_image}
                      className="h-32 w-full rounded-lg object-cover"
                      alt=""
                    />
                  )}
                  <label className="cursor-pointer inline-flex items-center gap-2 text-sm text-primary hover:underline">
                    <Upload className="h-4 w-4" /> Upload thumbnail image
                    <input type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) setHeroFile(e.target.files[0]); }} />
                  </label>
                </div>
              </div>

              {/* Raw Content */}
              <div>
                <Label>Content (Raw)</Label>
                <Textarea
                  value={form.content_raw}
                  onChange={e => updateForm('content_raw', e.target.value)}
                  placeholder="Write your course content here... The AI will format it beautifully."
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>

              {/* Enhance Button */}
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleEnhance}
                  disabled={enhancing || !form.content_raw?.trim()}
                  className="gap-2"
                >
                  {enhancing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {enhancing ? 'Enhancing...' : 'Enhance with AI'}
                </Button>
                {form.content_formatted && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => { setPreviewContent(form.content_formatted); setPreviewOpen(true); }}
                    className="gap-1"
                  >
                    <Eye className="h-4 w-4" /> Preview
                  </Button>
                )}
              </div>

              {/* Formatted Content (readonly preview) */}
              {form.content_formatted && (
                <div>
                  <Label>Formatted Content (AI Enhanced)</Label>
                  <div className="mt-1 border border-input rounded-md p-4 bg-muted/20 max-h-60 overflow-auto prose prose-sm max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: form.content_formatted }} />
                  </div>
                </div>
              )}

              {/* Pricing Section */}
              <div className="border border-input rounded-lg p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-base font-semibold">Pricing</Label>
                </div>
                <p className="text-xs text-muted-foreground">Prices will be shown based on user location. Payments handled via Razorpay.</p>

                <div className="flex items-center gap-3">
                  <Switch checked={form.enable_payment} onCheckedChange={v => updateForm('enable_payment', v)} />
                  <Label>Enable Payment</Label>
                </div>

                {form.enable_payment && (
                  <>
                    <div>
                      <Label>Payment Title</Label>
                      <Input
                        value={form.payment_title}
                        onChange={e => updateForm('payment_title', e.target.value)}
                        placeholder={form.title || 'Defaults to course title'}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>₹ INR (India)</Label>
                        <Input type="number" min="0" step="0.01" value={form.price_inr} onChange={e => updateForm('price_inr', e.target.value)} placeholder="0.00" />
                      </div>
                      <div>
                        <Label>$ USD (US)</Label>
                        <Input type="number" min="0" step="0.01" value={form.price_usd} onChange={e => updateForm('price_usd', e.target.value)} placeholder="0.00" />
                      </div>
                      <div>
                        <Label>€ EUR (Europe)</Label>
                        <Input type="number" min="0" step="0.01" value={form.price_eur} onChange={e => updateForm('price_eur', e.target.value)} placeholder="0.00" />
                      </div>
                      <div>
                        <Label>£ GBP (UK)</Label>
                        <Input type="number" min="0" step="0.01" value={form.price_gbp} onChange={e => updateForm('price_gbp', e.target.value)} placeholder="0.00" />
                      </div>
                    </div>
                    {![form.price_inr, form.price_usd, form.price_eur, form.price_gbp].some(p => p && parseFloat(p) > 0) && (
                      <p className="text-xs text-destructive">At least one price is required when payment is enabled</p>
                    )}
                  </>
                )}
              </div>

              {/* Publish Toggle */}
              <div className="flex items-center gap-3 pt-2">
                <Switch checked={form.published} onCheckedChange={v => updateForm('published', v)} />
                <Label>Published</Label>
              </div>

              {/* Save */}
              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? 'Saving...' : editing ? 'Update Course' : 'Create Course'}
              </Button>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader><DialogTitle>Content Preview</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-100px)]">
            <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: previewContent }} />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CoursesBlogPage;
