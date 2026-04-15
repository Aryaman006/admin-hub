import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Calendar,
  User,
  BookOpen,
  Clock,
  CheckCircle2,
  ShieldCheck,
  Star,
  Play,
} from 'lucide-react';

interface CourseDetail {
  id: string;
  title: string;
  slug: string;
  author_name: string | null;
  featured_image: string | null;
  content_formatted: string | null;
  content_raw: string | null;
  created_at: string;
  price_inr: number | null;
  price_usd: number | null;
  price_eur: number | null;
  price_gbp: number | null;
  enable_payment: boolean;
  payment_title: string | null;
}

const getLocalPrice = (course: CourseDetail) => {
  const lang = navigator.language || 'en-US';
  if (lang.includes('en-IN') || lang.includes('hi')) {
    if (course.price_inr) return { amount: course.price_inr, symbol: '₹', currency: 'INR' };
  }
  if (lang.includes('en-GB')) {
    if (course.price_gbp) return { amount: course.price_gbp, symbol: '£', currency: 'GBP' };
  }
  if (['de', 'fr', 'es', 'it', 'nl', 'pt'].some(l => lang.startsWith(l))) {
    if (course.price_eur) return { amount: course.price_eur, symbol: '€', currency: 'EUR' };
  }
  if (course.price_usd) return { amount: course.price_usd, symbol: '$', currency: 'USD' };
  if (course.price_inr) return { amount: course.price_inr, symbol: '₹', currency: 'INR' };
  if (course.price_eur) return { amount: course.price_eur, symbol: '€', currency: 'EUR' };
  if (course.price_gbp) return { amount: course.price_gbp, symbol: '£', currency: 'GBP' };
  return null;
};

const CourseDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchCourse = async () => {
      if (!slug) return;
      const { data, error } = await supabase
        .from('courses')
        .select('id, title, slug, author_name, featured_image, content_formatted, content_raw, created_at, price_inr, price_usd, price_eur, price_gbp, enable_payment, payment_title')
        .eq('slug', slug)
        .eq('published', true)
        .single();

      if (error || !data) {
        setNotFound(true);
      } else {
        setCourse(data as any);
      }
      setLoading(false);
    };
    fetchCourse();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <Skeleton className="h-8 w-48 mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="aspect-video rounded-xl" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/5" />
            </div>
            <div>
              <Skeleton className="h-72 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !course) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <BookOpen className="h-12 w-12 text-muted-foreground" />
        <h1 className="text-2xl font-bold text-foreground">Course Not Found</h1>
        <p className="text-muted-foreground">This course may have been removed or doesn't exist.</p>
        <Link to="/courses">
          <Button variant="outline">← Browse Courses</Button>
        </Link>
      </div>
    );
  }

  const price = course.enable_payment ? getLocalPrice(course) : null;
  const isFree = !course.enable_payment;

  return (
    <div className="min-h-screen bg-background">
      {/* Top Nav */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link
            to="/courses"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> All Courses
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-muted/50 to-background">
        <div className="max-w-6xl mx-auto px-4 py-10 md:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
            {/* Left: Course Info */}
            <div className="lg:col-span-3 space-y-5">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="text-xs">
                  <BookOpen className="h-3 w-3 mr-1" /> Course
                </Badge>
                {isFree && (
                  <Badge className="bg-green-600/90 text-white text-xs">Free</Badge>
                )}
              </div>

              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight tracking-tight">
                {course.title}
              </h1>

              {/* Meta Row */}
              <div className="flex items-center gap-5 text-sm text-muted-foreground flex-wrap">
                {course.author_name && (
                  <span className="flex items-center gap-1.5">
                    <User className="h-4 w-4" />
                    {course.author_name}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {new Date(course.created_at).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>

              {/* Course Highlights */}
              <div className="flex items-center gap-4 flex-wrap pt-2">
                {[
                  { icon: Clock, label: 'Self-paced' },
                  { icon: ShieldCheck, label: 'Lifetime access' },
                  { icon: Star, label: 'Expert-led' },
                ].map(({ icon: Icon, label }) => (
                  <span
                    key={label}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-full"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: Pricing Card */}
            <div className="lg:col-span-2">
              <Card className="overflow-hidden shadow-lg border-border/60">
                {/* Card Image */}
                {course.featured_image && (
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={course.featured_image}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardContent className="p-6 space-y-5">
                  {/* Price */}
                  {price ? (
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-foreground">
                        {price.symbol}{price.amount.toLocaleString()}
                      </span>
                      <span className="text-sm text-muted-foreground">{price.currency}</span>
                    </div>
                  ) : (
                    <p className="text-2xl font-bold text-green-600">Free</p>
                  )}

                  {/* CTA */}
                  <Button size="lg" className="w-full gap-2 text-base">
                    <Play className="h-4 w-4" />
                    {price ? 'Enroll Now' : 'Start Learning'}
                  </Button>

                  <Separator />

                  {/* Includes */}
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-foreground">This course includes:</p>
                    {[
                      'Full course content',
                      'Lifetime access',
                      'Access on mobile & desktop',
                      'Certificate of completion',
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                        {item}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Course Content */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3">
            <h2 className="text-2xl font-bold text-foreground mb-6">Course Content</h2>

            {course.content_formatted ? (
              <div
                className="prose prose-lg max-w-none text-foreground
                  prose-headings:text-foreground prose-p:text-foreground/90
                  prose-a:text-primary prose-strong:text-foreground
                  prose-blockquote:border-primary/30 prose-blockquote:text-muted-foreground
                  prose-ul:text-foreground/90 prose-ol:text-foreground/90
                  prose-img:rounded-xl"
                dangerouslySetInnerHTML={{ __html: course.content_formatted }}
              />
            ) : (
              <p className="text-muted-foreground">Course content will be available soon.</p>
            )}
          </div>

          {/* Sticky sidebar on desktop */}
          <div className="lg:col-span-2 hidden lg:block">
            <div className="sticky top-20">
              {course.author_name && (
                <Card>
                  <CardContent className="p-5 space-y-3">
                    <p className="text-sm font-semibold text-foreground">Instructor</p>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{course.author_name}</p>
                        <p className="text-xs text-muted-foreground">Course Instructor</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA (mobile) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border p-4 z-20">
        <div className="flex items-center justify-between gap-4">
          <div>
            {price ? (
              <span className="text-xl font-bold text-foreground">
                {price.symbol}{price.amount.toLocaleString()}
              </span>
            ) : (
              <span className="text-lg font-bold text-green-600">Free</span>
            )}
          </div>
          <Button size="lg" className="gap-2">
            <Play className="h-4 w-4" />
            {price ? 'Enroll Now' : 'Start Learning'}
          </Button>
        </div>
      </div>

      {/* Footer spacer for mobile sticky bar */}
      <div className="h-20 lg:hidden" />
    </div>
  );
};

export default CourseDetailPage;
