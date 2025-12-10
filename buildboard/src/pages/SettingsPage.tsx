import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Database, Trash2, Lock } from "lucide-react";
import { UserManagement } from "@/components/forms/UserManagement";

type JobTitle =
  | "foreman"
  | "construction_manager"
  | "project_manager"
  | "assistant_project_manager"
  | "superintendent"
  | "project_controls"
  | "field_engineer"
  | "field_quality_manager";

const JOB_TITLES: { value: JobTitle; label: string }[] = [
  { value: "foreman", label: "Foreman" },
  { value: "construction_manager", label: "Construction Manager" },
  { value: "project_manager", label: "Project Manager" },
  { value: "assistant_project_manager", label: "Assistant Project Manager" },
  { value: "superintendent", label: "Superintendent" },
  { value: "project_controls", label: "Project Controls" },
  { value: "field_engineer", label: "Field Engineer" },
  { value: "field_quality_manager", label: "Field Quality Manager" },
];

export function SettingsPage() {
  const profile = useQuery(api.userProfiles.getCurrentProfile);
  // Track local edits - null means use profile value
  const [nameEdit, setNameEdit] = useState<string | null>(null);
  const [roleEdit, setRoleEdit] = useState<"control_center" | "construction_manager" | null>(null);
  const [jobTitleEdit, setJobTitleEdit] = useState<JobTitle | "" | null>(null);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");

  const upsertProfile = useMutation(api.userProfiles.upsertProfile);
  const seedDemoData = useMutation(api.seed.seedDemoData);
  const clearSampleData = useMutation(api.seed.clearSampleData);
  const changePassword = useAction(api.users.changePassword);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<"idle" | "success" | "error">("idle");
  const [passwordMessage, setPasswordMessage] = useState("");

  // Computed values - use edit if set, otherwise fall back to profile
  const name = nameEdit ?? profile?.name ?? "";
  const role = roleEdit ?? profile?.role ?? "construction_manager";
  const jobTitle = jobTitleEdit ?? profile?.jobTitle ?? "";

  const isControlCenter = profile?.role === "control_center";

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      setStatus("error");
      setStatusMessage("Please enter your name");
      return;
    }

    try {
      await upsertProfile({
        name: name.trim(),
        role,
        jobTitle: jobTitle || undefined,
      });
      setStatus("success");
      setStatusMessage("Profile saved successfully!");
    } catch {
      setStatus("error");
      setStatusMessage("Error saving profile");
    }
  };

  const handleSeedData = async () => {
    try {
      const result = await seedDemoData({});
      setStatus("success");
      setStatusMessage(result.message);
    } catch {
      setStatus("error");
      setStatusMessage("Error seeding demo data");
    }
  };

  const handleClearData = async () => {
    try {
      const result = await clearSampleData({});
      setStatus("success");
      setStatusMessage(result.message);
    } catch {
      setStatus("error");
      setStatusMessage("Error clearing sample data");
    }
  };

  const handleChangePassword = async () => {
    setPasswordStatus("idle");
    setPasswordMessage("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordStatus("error");
      setPasswordMessage("Please fill in all password fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordStatus("error");
      setPasswordMessage("New passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordStatus("error");
      setPasswordMessage("New password must be at least 8 characters");
      return;
    }

    try {
      await changePassword({ currentPassword, newPassword });
      setPasswordStatus("success");
      setPasswordMessage("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordStatus("error");
      setPasswordMessage(err instanceof Error ? err.message : "Error changing password");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Settings
        </h1>
        <p className="text-slate-500 mt-1">Manage your profile and preferences</p>
      </div>

      {/* Status Message - Show at top for visibility */}
      {status !== "idle" && (
        <div
          className={`flex items-center gap-2 p-4 rounded-lg ${
            status === "success"
              ? "bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200"
              : "bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200"
          }`}
        >
          {status === "success" ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Two-column layout for Profile and Password on larger screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Settings */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setNameEdit(e.target.value)}
                placeholder="Enter your name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Access Level</Label>
              <Select
                value={role}
                onValueChange={(v: "control_center" | "construction_manager") => setRoleEdit(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="control_center">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-purple-100 text-purple-800">
                        Control Center
                      </Badge>
                    </div>
                  </SelectItem>
                  <SelectItem value="construction_manager">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-100 text-blue-800">
                        Field User
                      </Badge>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="jobTitle">Job Title</Label>
              <Select
                value={jobTitle}
                onValueChange={(v: JobTitle) => setJobTitleEdit(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your job title" />
                </SelectTrigger>
                <SelectContent>
                  {JOB_TITLES.map((jt) => (
                    <SelectItem key={jt.value} value={jt.value}>
                      {jt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={() => void handleSaveProfile()} className="w-full">
              Save Profile
            </Button>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Change Password
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 8 characters"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>

            {passwordStatus !== "idle" && (
              <div
                className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                  passwordStatus === "success"
                    ? "bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200"
                    : "bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200"
                }`}
              >
                {passwordStatus === "success" ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <span>{passwordMessage}</span>
              </div>
            )}

            <Button onClick={() => void handleChangePassword()} className="w-full">
              Change Password
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Demo Data - Compact inline card */}
      <Card>
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Demo Data</p>
              <p className="text-sm text-muted-foreground">
                Seed sample projects and entries for testing
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void handleSeedData()}>
              Seed Data
            </Button>
            <Button variant="destructive" size="sm" onClick={() => void handleClearData()}>
              <Trash2 className="mr-1 h-4 w-4" />
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* User Management - Control Center only, full width */}
      {isControlCenter && <UserManagement />}
    </div>
  );
}
