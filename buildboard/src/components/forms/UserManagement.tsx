import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Users, Pencil, Trash2, UserPlus, Copy, CheckCircle, AlertCircle } from "lucide-react";

type Role = "control_center" | "construction_manager";
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

const ROLES: { value: Role; label: string; description: string }[] = [
  {
    value: "control_center",
    label: "Control Center",
    description: "Full access to all projects and user management",
  },
  {
    value: "construction_manager",
    label: "Field User",
    description: "Access to assigned projects, can submit daily entries",
  },
];

function getJobTitleLabel(jobTitle?: string): string {
  const found = JOB_TITLES.find((j) => j.value === jobTitle);
  return found?.label ?? "Not Set";
}

function getRoleBadge(role: Role) {
  if (role === "control_center") {
    return <Badge className="bg-purple-100 text-purple-800">Control Center</Badge>;
  }
  return <Badge className="bg-blue-100 text-blue-800">Field User</Badge>;
}

// Generate a random temporary password
function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CreateUserDialog({ open: _open, onOpenChange }: CreateUserDialogProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("construction_manager");
  const [jobTitle, setJobTitle] = useState<JobTitle | "">("");
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [tempPassword, setTempPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdUser, setCreatedUser] = useState<{ email: string; password: string } | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const projects = useQuery(api.projects.list);
  const createUser = useAction(api.users.createUserAccount);

  const toggleProject = (projectId: string) => {
    setSelectedProjects((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const password = tempPassword || generateTempPassword();

    try {
      await createUser({
        email: email.trim(),
        password,
        name: name.trim(),
        role,
        jobTitle: jobTitle || undefined,
        projectIds: selectedProjects.length > 0 ? selectedProjects as Id<"projects">[] : undefined,
      });
      setCreatedUser({ email: email.trim(), password });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCredentials = async () => {
    if (!createdUser) return;
    const text = `Email: ${createdUser.email}\nTemporary Password: ${createdUser.password}\n\nPlease log in and change your password in Settings.`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setEmail("");
    setName("");
    setRole("construction_manager");
    setJobTitle("");
    setSelectedProjects([]);
    setTempPassword("");
    setCreatedUser(null);
    setError("");
    setCopied(false);
    onOpenChange(false);
  };

  if (createdUser) {
    return (
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            User Created Successfully
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Share these credentials with the new user. They should change their
            password after logging in.
          </p>
          <div className="bg-muted p-4 rounded-lg space-y-2 font-mono text-sm">
            <div>
              <span className="text-muted-foreground">Email: </span>
              <span className="font-medium">{createdUser.email}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Temporary Password: </span>
              <span className="font-medium">{createdUser.password}</span>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => void handleCopyCredentials()}>
              {copied ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Credentials
                </>
              )}
            </Button>
            <Button onClick={handleClose}>Done</Button>
          </div>
        </div>
      </DialogContent>
    );
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create New User</DialogTitle>
      </DialogHeader>
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="newUserEmail">Email</Label>
          <Input
            id="newUserEmail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@company.com"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="newUserName">Name</Label>
          <Input
            id="newUserName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Smith"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="newUserRole">Access Level</Label>
          <Select value={role} onValueChange={(v: Role) => setRole(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="newUserJobTitle">Job Title</Label>
          <Select
            value={jobTitle}
            onValueChange={(v: JobTitle | "") => setJobTitle(v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select job title" />
            </SelectTrigger>
            <SelectContent>
              {JOB_TITLES.map((j) => (
                <SelectItem key={j.value} value={j.value}>
                  {j.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Project Assignment - only show for Field Users */}
        {role === "construction_manager" && projects && projects.length > 0 && (
          <div className="space-y-2">
            <Label>Assign to Projects</Label>
            <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
              {projects.filter((p): p is NonNullable<typeof p> => p !== null).map((project) => (
                <label
                  key={project._id}
                  className="flex items-center gap-2 cursor-pointer hover:bg-muted p-1 rounded"
                >
                  <input
                    type="checkbox"
                    checked={selectedProjects.includes(project._id)}
                    onChange={() => toggleProject(project._id)}
                    className="h-4 w-4 rounded border-input"
                  />
                  <span className="text-sm">{project.name}</span>
                  <Badge variant="outline" className="ml-auto text-xs">
                    {project.status}
                  </Badge>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Field users can only access projects they are assigned to.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="newUserPassword">
            Temporary Password{" "}
            <span className="text-muted-foreground font-normal">
              (leave blank to auto-generate)
            </span>
          </Label>
          <Input
            id="newUserPassword"
            type="text"
            value={tempPassword}
            onChange={(e) => setTempPassword(e.target.value)}
            placeholder="Auto-generated if empty"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200 rounded-lg text-sm">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create User"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}

interface EditUserDialogProps {
  user: {
    _id: Id<"userProfiles">;
    userId: Id<"users">;
    name: string;
    email: string;
    role: Role;
    jobTitle?: JobTitle;
    assignedProjects?: { _id: string; name: string }[];
  };
  onClose: () => void;
}

function EditUserDialog({ user, onClose }: EditUserDialogProps) {
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState<Role>(user.role);
  const [jobTitle, setJobTitle] = useState<JobTitle | "">(user.jobTitle ?? "");
  const [selectedProjects, setSelectedProjects] = useState<string[]>(
    user.assignedProjects?.map((p) => p._id) ?? []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const projects = useQuery(api.projects.list);
  const updateUser = useMutation(api.userProfiles.updateUserProfile);
  const assignUser = useMutation(api.projects.assignUser);
  const unassignUser = useMutation(api.projects.unassignUser);

  const toggleProject = (projectId: string) => {
    setSelectedProjects((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Update user profile
      await updateUser({
        profileId: user._id,
        name,
        role,
        jobTitle: jobTitle || undefined,
      });

      // Update project assignments for field users
      if (role === "construction_manager") {
        const currentProjects = user.assignedProjects?.map((p) => p._id) ?? [];

        // Add new assignments
        for (const projectId of selectedProjects) {
          if (!currentProjects.includes(projectId)) {
            await assignUser({
              projectId: projectId as Id<"projects">,
              userId: user.userId,
            });
          }
        }

        // Remove old assignments
        for (const projectId of currentProjects) {
          if (!selectedProjects.includes(projectId)) {
            await unassignUser({
              projectId: projectId as Id<"projects">,
              userId: user.userId,
            });
          }
        }
      }

      onClose();
    } catch (error) {
      console.error("Error updating user:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="editName">Name</Label>
        <Input
          id="editName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Email</Label>
        <Input value={user.email} disabled className="bg-muted" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="editRole">Access Level</Label>
        <Select value={role} onValueChange={(v: Role) => setRole(v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                <div className="flex flex-col">
                  <span>{r.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {r.description}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="editJobTitle">Job Title</Label>
        <Select
          value={jobTitle}
          onValueChange={(v: JobTitle | "") => setJobTitle(v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select job title" />
          </SelectTrigger>
          <SelectContent>
            {JOB_TITLES.map((j) => (
              <SelectItem key={j.value} value={j.value}>
                {j.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Project Assignment - only show for Field Users */}
      {role === "construction_manager" && projects && projects.length > 0 && (
        <div className="space-y-2">
          <Label>Assigned Projects</Label>
          <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
            {projects.filter((p): p is NonNullable<typeof p> => p !== null).map((project) => (
              <label
                key={project._id}
                className="flex items-center gap-2 cursor-pointer hover:bg-muted p-1 rounded"
              >
                <input
                  type="checkbox"
                  checked={selectedProjects.includes(project._id)}
                  onChange={() => toggleProject(project._id)}
                  className="h-4 w-4 rounded border-input"
                />
                <span className="text-sm">{project.name}</span>
                <Badge variant="outline" className="ml-auto text-xs">
                  {project.status}
                </Badge>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}

export function UserManagement() {
  const users = useQuery(api.userProfiles.listAll);
  const deleteUser = useMutation(api.userProfiles.deleteUserProfile);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const handleDelete = async (profileId: Id<"userProfiles">) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return;
    }
    setDeletingUser(profileId);
    try {
      await deleteUser({ profileId });
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Failed to delete user. You cannot delete your own account.");
    } finally {
      setDeletingUser(null);
    }
  };

  if (!users) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading users...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          User Management
        </CardTitle>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Create User
            </Button>
          </DialogTrigger>
          <CreateUserDialog
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
          />
        </Dialog>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Create accounts for your team members and manage their access levels.
          When you create an account, you'll receive a temporary password to share with them.
        </p>

        {users.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No users found. Click "Create User" to add team members.
          </p>
        ) : (
          <div className="space-y-3">
            {users.map((user) => (
              <div
                key={user._id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                {/* User info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{user.name}</span>
                    {getRoleBadge(user.role)}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">{getJobTitleLabel(user.jobTitle)}</span>
                    {user.role === "construction_manager" && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        {user.assignedProjects && user.assignedProjects.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {user.assignedProjects.map((p: { _id: string; name: string }) => (
                              <Badge key={p._id} variant="outline" className="text-xs">
                                {p.name}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No projects</span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 sm:ml-auto">
                  <Dialog
                    open={editingUser === user._id}
                    onOpenChange={(open) =>
                      setEditingUser(open ? user._id : null)
                    }
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Pencil className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit User</DialogTitle>
                      </DialogHeader>
                      <EditUserDialog
                        user={user as any}
                        onClose={() => setEditingUser(null)}
                      />
                    </DialogContent>
                  </Dialog>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleDelete(user._id)}
                    disabled={deletingUser === user._id}
                    className="text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
