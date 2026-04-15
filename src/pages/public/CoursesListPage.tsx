import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, User } from 'lucide-react';

interface BlogCard {
  id: string;
  title: string;
  slug: string;
  author_name: string | null;
  featured_image: string | null;
  created_at: string;
}

const CoursesListPage = () => {
  const [blogs, setBlogs] = useState<BlogCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlogs = async () => {
      const { data } = await supabase
        .from('courses')
        .select('id, title, slug, author_name, featured_image, created_at')
        .eq('published', true)
        .order('created_at', { ascending: false });
      setBlogs((data as any[]) || []);
      setLoading(false);
    };
    fetchBlogs();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-foreground">Playoga</Link>
          <nav>
            <Link to="/courses" className="text-sm font-medium text-primary">Courses</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Our Courses</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Explore our collection of wellness and yoga articles crafted by experts.
          </p>
        </div>
      </section>

      {/* Grid */}
      <section className="pb-20 px-4">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-48 rounded-xl" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : blogs.length === 0 ? (
            <p className="text-center text-muted-foreground py-20">No courses published yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {blogs.map(blog => (
                <Link
                  key={blog.id}
                  to={`/courses/${blog.slug}`}
                  className="group rounded-xl border border-border bg-card overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="aspect-video overflow-hidden bg-muted">
                    {blog.featured_image ? (
                      <img
                        src={blog.featured_image}
                        alt={blog.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        No Image
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h2 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-3">
                      {blog.title}
                    </h2>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {blog.author_name && (
                        <span className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5" />
                          {blog.author_name}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(blog.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default CoursesListPage;
