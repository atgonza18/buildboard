import { Link, useLocation } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  LayoutDashboard,
  FolderKanban,
  ClipboardList,
  Trophy,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";

interface SidebarProps {
  projectId?: string;
}

export function Sidebar({ projectId }: SidebarProps) {
  const location = useLocation();
  const { signOut } = useAuthActions();
  const [collapsed, setCollapsed] = useState(false);
  const profile = useQuery(api.userProfiles.getCurrentProfile);

  const isControlCenter = profile?.role === "control_center";

  // Build navigation items based on user role
  const mainNavigation = [
    ...(isControlCenter
      ? [
          {
            name: "Overview",
            href: "/dashboard",
            icon: Building2,
          },
        ]
      : []),
    {
      name: "Dashboard",
      href: projectId ? `/project/${projectId}` : "/projects",
      icon: LayoutDashboard,
    },
    {
      name: "Projects",
      href: "/projects",
      icon: FolderKanban,
    },
    {
      name: "Daily Entry",
      href: projectId ? `/project/${projectId}/entry` : "/entry",
      icon: ClipboardList,
    },
    {
      name: "Leaderboard",
      href: projectId ? `/project/${projectId}/leaderboard` : "/leaderboard",
      icon: Trophy,
    },
  ];

  const bottomNavigation = [
    {
      name: "Settings",
      href: "/settings",
      icon: Settings,
    },
  ];

  const isActive = (href: string) => {
    if (href === "/dashboard" && location.pathname === "/dashboard") return true;
    if (href === "/projects" && location.pathname === "/projects") return true;
    if (href === "/settings" && location.pathname === "/settings") return true;
    if (href.startsWith("/project/") && location.pathname.startsWith("/project/")) {
      // Check if it's the same project route type
      if (href.includes("/entry") && location.pathname.includes("/entry")) return true;
      if (href.includes("/leaderboard") && location.pathname.includes("/leaderboard")) return true;
      if (!href.includes("/entry") && !href.includes("/leaderboard") && !href.includes("/scope") &&
          !location.pathname.includes("/entry") && !location.pathname.includes("/leaderboard") && !location.pathname.includes("/scope")) {
        return true;
      }
    }
    return false;
  };

  return (
    <div
      className={cn(
        "flex flex-col h-screen bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 transition-all duration-200 ease-in-out",
        collapsed ? "w-[68px]" : "w-60"
      )}
    >
      {/* Logo Area */}
      <div
        className={cn(
          "flex items-center h-14",
          collapsed ? "justify-center px-2" : "justify-between px-4"
        )}
      >
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">B</span>
            </div>
            <span className="font-semibold text-slate-900 dark:text-white tracking-tight">
              BuildBoard
            </span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">B</span>
          </div>
        )}
      </div>

      {/* Collapse Toggle */}
      <div className={cn("px-3 mb-2", collapsed && "flex justify-center")}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {mainNavigation.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.name}
              to={item.href}
              title={collapsed ? item.name : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                active
                  ? "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50",
                collapsed && "justify-center px-2"
              )}
            >
              <item.icon
                size={18}
                className={cn(
                  active ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500"
                )}
              />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Navigation */}
      <div className="py-4 px-3 space-y-1">
        {bottomNavigation.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.name}
              to={item.href}
              title={collapsed ? item.name : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                active
                  ? "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50",
                collapsed && "justify-center px-2"
              )}
            >
              <item.icon
                size={18}
                className={cn(
                  active ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500"
                )}
              />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}

        {/* Sign Out Button */}
        <button
          onClick={() => void signOut()}
          title={collapsed ? "Sign Out" : undefined}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors w-full",
            "text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30",
            collapsed && "justify-center px-2"
          )}
        >
          <LogOut size={18} className="text-slate-400 dark:text-slate-500" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );
}
