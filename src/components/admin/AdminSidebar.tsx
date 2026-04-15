import { useState } from "react";
import { NavLink as RouterNavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  Building2,
  Video,
  Radio,
  CreditCard,
  BarChart3,
  LogOut,
  Menu,
  X,
  Sparkles,
  BookOpen,
  ImagePlus,
  FileText,
  Wallet,
  UserCog,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionsContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/constants/navItems";

const iconMap: Record<string, any> = {
  "/dashboard": LayoutDashboard,
  "/users": Users,
  "/categories": FolderOpen,
  "/corporates": Building2,
  "/videos": Video,
  "/live-classes": Radio,
  "/payments": CreditCard,
  "/analytics": BarChart3,
  "/courses-blog": BookOpen,
  "/media-events": ImagePlus,
  "/blogs": FileText,
  "/withdrawals": Wallet,
  "/staff": UserCog,
};

const AdminSidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { canRead, isSuperAdmin } = usePermissions();

  const handleSignOut = async () => {
    await signOut();
  };

  // Filter nav items based on permissions
  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.module === 'staff') return isSuperAdmin;
    return canRead(item.module);
  });

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="font-bold text-lg">Playoga</h1>
              <p className="text-xs text-muted-foreground">Admin Panel</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const isActive = location.pathname === item.to;
          const Icon = iconMap[item.to];
          return (
            <RouterNavLink
              key={item.to}
              to={item.to}
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                "hover:bg-accent hover:text-accent-foreground",
                isActive && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
              )}
            >
              {Icon && <Icon className="w-5 h-5 shrink-0" />}
              {!isCollapsed && <span className="font-medium">{item.label}</span>}
            </RouterNavLink>
          );
        })}
      </nav>

      {/* User & Logout */}
      <div className="p-3 border-t border-border/50 space-y-2">
        {!isCollapsed && user && (
          <div className="px-3 py-2 text-sm">
            <p className="font-medium truncate">{user.email}</p>
            <p className="text-xs text-muted-foreground">Administrator</p>
          </div>
        )}
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className={cn(
            "w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10",
            isCollapsed && "justify-center px-2",
          )}
        >
          <LogOut className="w-5 h-5" />
          {!isCollapsed && "Sign Out"}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-full w-64 bg-card border-r border-border z-50 transform transition-transform duration-300 md:hidden",
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <SidebarContent />
      </aside>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col h-screen bg-card border-r border-border transition-all duration-300 sticky top-0",
          isCollapsed ? "w-16" : "w-64",
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-3 top-6 z-10 h-6 w-6 rounded-full border border-border bg-background shadow-sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <Menu className="w-3 h-3" />
        </Button>
        <SidebarContent />
      </aside>
    </>
  );
};

export default AdminSidebar;
