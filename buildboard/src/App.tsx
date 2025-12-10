"use client";

import { useState, useEffect } from "react";
import {
  Authenticated,
  Unauthenticated,
  useQuery,
} from "convex/react";
import { Routes, Route, useNavigate, useParams } from "react-router-dom";
import { api } from "../convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { MainLayout } from "@/components/layout/MainLayout";
import { DashboardPage } from "@/pages/DashboardPage";
import { ControlCenterDashboard } from "@/pages/ControlCenterDashboard";
import { ProjectsPage } from "@/pages/ProjectsPage";
import { LeaderboardPage } from "@/pages/LeaderboardPage";
import { EntryPage } from "@/pages/EntryPage";
import { ScopePage } from "@/pages/ScopePage";
import { SettingsPage } from "@/pages/SettingsPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function App() {
  return (
    <>
      <Authenticated>
        <AuthenticatedApp />
      </Authenticated>
      <Unauthenticated>
        <SignInForm />
      </Unauthenticated>
    </>
  );
}

function AuthenticatedApp() {
  const projects = useQuery(api.projects.list);
  const profile = useQuery(api.userProfiles.getCurrentProfile);
  const [manuallySelectedProjectId, setManuallySelectedProjectId] = useState<string | undefined>();
  const navigate = useNavigate();

  const isControlCenter = profile?.role === "control_center";

  // Derive the selected project - use manually selected or fall back to first project
  const selectedProjectId = manuallySelectedProjectId ??
    (projects && projects.length > 0 && projects[0] ? projects[0]._id : undefined);

  const handleProjectChange = (projectId: string) => {
    setManuallySelectedProjectId(projectId);
    void navigate(`/project/${projectId}`);
  };

  return (
    <MainLayout
      projectId={selectedProjectId}
      onProjectChange={handleProjectChange}
    >
      <Routes>
        {/* Control Center gets their own dashboard at root */}
        <Route path="/" element={isControlCenter ? <ControlCenterDashboard /> : <ProjectsPage />} />
        <Route path="/dashboard" element={<ControlCenterDashboard />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route
          path="/project/:projectId"
          element={<ProjectDashboardWrapper onProjectChange={setManuallySelectedProjectId} />}
        />
        <Route
          path="/project/:projectId/entry"
          element={<ProjectEntryWrapper onProjectChange={setManuallySelectedProjectId} />}
        />
        <Route
          path="/project/:projectId/leaderboard"
          element={<ProjectLeaderboardWrapper onProjectChange={setManuallySelectedProjectId} />}
        />
        <Route
          path="/project/:projectId/scope/:scopeId"
          element={<ProjectScopeWrapper onProjectChange={setManuallySelectedProjectId} />}
        />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/entry" element={<NoProjectSelected />} />
        <Route path="/leaderboard" element={<NoProjectSelected />} />
      </Routes>
    </MainLayout>
  );
}

// Wrapper components to extract route params
function ProjectDashboardWrapper({ onProjectChange }: { onProjectChange: (id: string) => void }) {
  const { projectId } = useParams();
  useEffect(() => {
    if (projectId) onProjectChange(projectId);
  }, [projectId, onProjectChange]);
  if (!projectId) return <NoProjectSelected />;
  return <DashboardPage projectId={projectId} />;
}

function ProjectEntryWrapper({ onProjectChange }: { onProjectChange: (id: string) => void }) {
  const { projectId } = useParams();
  useEffect(() => {
    if (projectId) onProjectChange(projectId);
  }, [projectId, onProjectChange]);
  if (!projectId) return <NoProjectSelected />;
  return <EntryPage projectId={projectId} />;
}

function ProjectLeaderboardWrapper({ onProjectChange }: { onProjectChange: (id: string) => void }) {
  const { projectId } = useParams();
  useEffect(() => {
    if (projectId) onProjectChange(projectId);
  }, [projectId, onProjectChange]);
  if (!projectId) return <NoProjectSelected />;
  return <LeaderboardPage projectId={projectId} />;
}

function ProjectScopeWrapper({ onProjectChange }: { onProjectChange: (id: string) => void }) {
  const { projectId, scopeId } = useParams();
  useEffect(() => {
    if (projectId) onProjectChange(projectId);
  }, [projectId, onProjectChange]);
  if (!projectId || !scopeId) return <NoProjectSelected />;
  return <ScopePage projectId={projectId} scopeId={scopeId} />;
}

function NoProjectSelected() {
  return (
    <div className="flex items-center justify-center h-64">
      <Card className="max-w-md">
        <CardContent className="pt-6 text-center">
          <p className="text-slate-500 mb-4">
            Please select a project from the dropdown above or visit the Projects page.
          </p>
          <Button onClick={() => window.location.href = "/projects"}>
            View Projects
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function SignInForm() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-blue-600">
            BuildBoard
          </CardTitle>
          <p className="text-slate-500">Construction Dashboard</p>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              const formData = new FormData(e.target as HTMLFormElement);
              formData.set("flow", flow);
              void signIn("password", formData).catch((error) => {
                setError(error.message);
              });
            }}
          >
            <div className="space-y-2">
              <Input
                type="email"
                name="email"
                placeholder="Email"
                required
              />
            </div>
            <div className="space-y-2">
              <Input
                type="password"
                name="password"
                placeholder="Password"
                required
              />
            </div>
            <Button type="submit" className="w-full">
              {flow === "signIn" ? "Sign In" : "Sign Up"}
            </Button>
            <div className="text-center text-sm">
              <span className="text-slate-500">
                {flow === "signIn"
                  ? "Don't have an account? "
                  : "Already have an account? "}
              </span>
              <button
                type="button"
                className="text-blue-600 hover:underline font-medium"
                onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
              >
                {flow === "signIn" ? "Sign up" : "Sign in"}
              </button>
            </div>
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
