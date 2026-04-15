import { AdminModule } from '@/types/permissions';

export interface NavItem {
  to: string;
  label: string;
  module: AdminModule;
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", module: "dashboard" },
  { to: "/users", label: "Users", module: "users" },
  { to: "/categories", label: "Categories", module: "categories" },
  { to: "/corporates", label: "Corporates", module: "corporates" },
  { to: "/videos", label: "Videos", module: "videos" },
  { to: "/live-classes", label: "Live Classes", module: "live_classes" },
  { to: "/payments", label: "Payments", module: "payments" },
  { to: "/analytics", label: "Analytics", module: "analytics" },
  { to: "/courses-blog", label: "Courses Blog", module: "courses_blog" },
  { to: "/media-events", label: "Media & Events", module: "media_events" },
  { to: "/blogs", label: "Blogs", module: "blogs" },
  { to: "/withdrawals", label: "Withdrawals", module: "withdrawals" },
  { to: "/staff", label: "Staff", module: "staff" },
];
