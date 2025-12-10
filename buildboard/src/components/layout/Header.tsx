import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ChevronDown, Circle } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";

interface HeaderProps {
  projectId?: string;
  onProjectChange?: (projectId: string) => void;
}

export function Header({ projectId, onProjectChange }: HeaderProps) {
  const profile = useQuery(api.userProfiles.getCurrentProfile);
  const projects = useQuery(api.projects.list);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentProject = projects?.find(
    (p) => p && p._id === (projectId as Id<"projects">)
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProjectDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-emerald-500";
      case "completed":
        return "text-slate-400";
      case "on_hold":
        return "text-amber-500";
      default:
        return "text-slate-400";
    }
  };

  return (
    <header className="flex items-center justify-between h-14 px-6 bg-slate-50 dark:bg-slate-900">
      {/* Project Selector */}
      <div className="flex items-center gap-4">
        {projects && projects.length > 0 && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {currentProject ? (
                <>
                  <Circle
                    size={8}
                    className={cn("fill-current", getStatusColor(currentProject.status))}
                  />
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {currentProject.name}
                  </span>
                </>
              ) : (
                <span className="text-sm text-slate-500">Select a project</span>
              )}
              <ChevronDown
                size={14}
                className={cn(
                  "text-slate-400 transition-transform",
                  isProjectDropdownOpen && "rotate-180"
                )}
              />
            </button>

            {/* Dropdown */}
            {isProjectDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shadow-lg py-1 z-50">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Projects
                  </p>
                </div>
                <div className="max-h-64 overflow-y-auto py-1">
                  {projects.filter(Boolean).map((project) => (
                    <button
                      key={project!._id}
                      onClick={() => {
                        onProjectChange?.(project!._id);
                        setIsProjectDropdownOpen(false);
                      }}
                      className={cn(
                        "flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors",
                        project!._id === projectId && "bg-slate-50 dark:bg-slate-800"
                      )}
                    >
                      <Circle
                        size={8}
                        className={cn("fill-current flex-shrink-0", getStatusColor(project!.status))}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                          {project!.name}
                        </p>
                        <p className="text-xs text-slate-500 capitalize">
                          {project!.status.replace("_", " ")}
                        </p>
                      </div>
                      {project!._id === projectId && (
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-900 dark:bg-white" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* User Info */}
      <div className="flex items-center gap-3">
        {profile && (
          <>
            {/* Role Indicator */}
            <span
              className={cn(
                "text-xs font-medium px-2.5 py-1 rounded-full",
                profile.role === "control_center"
                  ? "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              )}
            >
              {profile.role === "control_center" ? "Control Center" : "Field User"}
            </span>

            {/* Divider */}
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />

            {/* User Avatar & Name */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  {getInitials(profile.name)}
                </span>
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {profile.name}
              </span>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
