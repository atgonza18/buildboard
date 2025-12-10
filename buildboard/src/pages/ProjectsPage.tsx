import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProjectForm } from "@/components/forms/ProjectForm";
import { FolderKanban, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export function ProjectsPage() {
  const projects = useQuery(api.projects.list);
  const profile = useQuery(api.userProfiles.getCurrentProfile);

  const isControlCenter = profile?.role === "control_center";

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "completed":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      case "on_hold":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Projects
          </h1>
          <p className="text-slate-500 mt-1">
            {isControlCenter
              ? "Manage all construction projects"
              : "Your assigned projects"}
          </p>
        </div>
        {isControlCenter && <ProjectForm />}
      </div>

      {/* Projects Grid */}
      {projects && projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.filter(Boolean).map((project) => {
            if (!project) return null;
            return (
              <Card
                key={project._id}
                className="hover:shadow-lg transition-shadow"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                        <FolderKanban className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                    </div>
                    <Badge className={getStatusColor(project.status)}>
                      {project.status.replace("_", " ")}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {project.description && (
                    <p className="text-sm text-slate-500 line-clamp-2">
                      {project.description}
                    </p>
                  )}
                  <Link to={`/project/${project._id}`}>
                    <Button variant="outline" className="w-full">
                      View Dashboard
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
          <FolderKanban className="mx-auto h-12 w-12 text-slate-400 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
            No projects yet
          </h3>
          <p className="text-slate-500 mb-4">
            {isControlCenter
              ? "Create your first project to get started."
              : "You haven't been assigned to any projects yet."}
          </p>
          {isControlCenter && <ProjectForm />}
        </div>
      )}
    </div>
  );
}
