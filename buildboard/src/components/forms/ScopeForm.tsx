import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

interface ScopeFormProps {
  projectId: string;
  onSuccess?: (scopeId: string) => void;
}

export function ScopeForm({ projectId, onSuccess }: ScopeFormProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createScope = useMutation(api.scopes.create);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const scopeId = await createScope({
        projectId: projectId as Id<"projects">,
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setOpen(false);
      setName("");
      setDescription("");
      onSuccess?.(scopeId);
    } catch (error) {
      console.error("Error creating scope:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Scope
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Scope</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="scopeName">Scope Name</Label>
            <Input
              id="scopeName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Electrical, Mechanical, Civil"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="scopeDescription">Description (optional)</Label>
            <Input
              id="scopeDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter scope description"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? "Adding..." : "Add Scope"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
