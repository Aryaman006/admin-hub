import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { PermissionsProvider, usePermissions } from "@/contexts/PermissionsContext";
import { CorporateAuthProvider, useCorporateAuth } from "@/contexts/CorporateAuthContext";
import AdminLayout from "@/components/admin/AdminLayout";
import ProtectedRoute from "@/components/admin/ProtectedRoute";
import { NAV_ITEMS } from "@/constants/navItems";
import MaintenancePage from "./pages/MaintenancePage";
import Login from "./pages/Login";
import CorporateLogin from "./pages/CorporateLogin";
import CorporateDashboard from "./pages/corporate/CorporateDashboard";
import Dashboard from "./pages/admin/Dashboard";
import UsersPage from "./pages/admin/UsersPage";
import CategoriesPage from "./pages/admin/CategoriesPage";
import VideosPage from "./pages/admin/VideosPage";
import LiveClassesPage from "./pages/admin/LiveClassesPage";
import PaymentsPage from "./pages/admin/PaymentsPage";
import AnalyticsPage from "./pages/admin/AnalyticsPage";
import CorporatesPage from "./pages/admin/CorporatesPage";
import CoursesBlogPage from "./pages/admin/courses/CoursesBlogPage";
import MediaEventsPage from "./pages/admin/MediaEventsPage";
import BlogListPage from "./pages/admin/blogs/BlogListPage";
import CreateBlogPage from "./pages/admin/blogs/CreateBlogPage";
import EditBlogPage from "./pages/admin/blogs/EditBlogPage";
import CoursesListPage from "./pages/public/CoursesListPage";
import CourseDetailPage from "./pages/public/CourseDetailPage";
import NotFound from "./pages/NotFound";
import WithdrawalRequestsPage from "./pages/admin/WithdrawlPage";
import StaffPage from "./pages/admin/StaffPage";

// TEMPORARY: Set to false to show the maintenance page, true to restore normal app
const MAINTENANCE_MODE_DISABLED = true;

const queryClient = new QueryClient();

const ProtectedLayout = () => {
  const { user, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <PermissionsProvider>
      <AdminLayout>
        <Outlet />
      </AdminLayout>
    </PermissionsProvider>
  );
};

/**
 * Redirects to the first nav item the staff member has read access to.
 * Super admins always land on /dashboard.
 */
const SmartDashboardRedirect = () => {
  const { canRead, isSuperAdmin, isLoading } = usePermissions();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (isSuperAdmin) return null; // render Dashboard normally

  // Find first allowed section
  const firstAllowed = NAV_ITEMS.find(
    (item) => item.module !== 'staff' && canRead(item.module)
  );

  if (firstAllowed && firstAllowed.to !== '/dashboard') {
    return <Navigate to={firstAllowed.to} replace />;
  }

  if (!firstAllowed) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <p className="text-lg font-semibold text-muted-foreground">No Access</p>
          <p className="text-sm text-muted-foreground">You don't have permission to view any section.</p>
        </div>
      </div>
    );
  }

  return null; // has dashboard access, render normally
};

const ProtectedCorporateRoute = () => {
  const { corporate, isLoading } = useCorporateAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!corporate) {
    return <Navigate to="/corporate-login" replace />;
  }

  return <Outlet />;
};

const AppRoutes = () => {
  const { user, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show maintenance page for public visitors
  if (!MAINTENANCE_MODE_DISABLED && !user) {
    return (
      <Routes>
        <Route path="/" element={<MaintenancePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/corporate-login" element={<CorporateLogin />} />
        <Route path="*" element={<MaintenancePage />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={user && isAdmin ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/corporate-login" element={<CorporateLogin />} />
      <Route path="/courses" element={<CoursesListPage />} />
      <Route path="/courses/:slug" element={<CourseDetailPage />} />
        <Route element={<ProtectedLayout />}>
        <Route path="/dashboard" element={<><SmartDashboardRedirect /><ProtectedRoute module="dashboard"><Dashboard /></ProtectedRoute></>} />
        <Route path="/users" element={<ProtectedRoute module="users"><UsersPage /></ProtectedRoute>} />
        <Route path="/categories" element={<ProtectedRoute module="categories"><CategoriesPage /></ProtectedRoute>} />
        <Route path="/corporates" element={<ProtectedRoute module="corporates"><CorporatesPage /></ProtectedRoute>} />
        <Route path="/videos" element={<ProtectedRoute module="videos"><VideosPage /></ProtectedRoute>} />
        <Route path="/live-classes" element={<ProtectedRoute module="live_classes"><LiveClassesPage /></ProtectedRoute>} />
        <Route path="/payments" element={<ProtectedRoute module="payments"><PaymentsPage /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute module="analytics"><AnalyticsPage /></ProtectedRoute>} />
        <Route path="/courses-blog" element={<ProtectedRoute module="courses_blog"><CoursesBlogPage /></ProtectedRoute>} />
        <Route path="/media-events" element={<ProtectedRoute module="media_events"><MediaEventsPage /></ProtectedRoute>} />
        <Route path="/blogs" element={<ProtectedRoute module="blogs"><BlogListPage /></ProtectedRoute>} />
        <Route path="/blogs/create" element={<ProtectedRoute module="blogs"><CreateBlogPage /></ProtectedRoute>} />
        <Route path="/blogs/edit/:id" element={<ProtectedRoute module="blogs"><EditBlogPage /></ProtectedRoute>} />
        <Route path="/withdrawals" element={<ProtectedRoute module="withdrawals"><WithdrawalRequestsPage /></ProtectedRoute>} />
        <Route path="/staff" element={<ProtectedRoute module="staff"><StaffPage /></ProtectedRoute>} />
      </Route>
      <Route
        element={
          <CorporateAuthProvider>
            <ProtectedCorporateRoute />
          </CorporateAuthProvider>
        }
      >
        <Route path="/corporate/dashboard" element={<CorporateDashboard />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
