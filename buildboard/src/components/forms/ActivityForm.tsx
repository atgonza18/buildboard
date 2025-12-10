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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";

// Common construction units of measure
const CONSTRUCTION_UNITS = [
  // Length
  { value: "LF", label: "Linear Feet (LF)" },
  { value: "SF", label: "Square Feet (SF)" },
  { value: "SY", label: "Square Yards (SY)" },
  { value: "CY", label: "Cubic Yards (CY)" },
  { value: "CF", label: "Cubic Feet (CF)" },
  // Count
  { value: "EA", label: "Each (EA)" },
  { value: "units", label: "Units" },
  { value: "panels", label: "Panels" },
  { value: "modules", label: "Modules" },
  { value: "fixtures", label: "Fixtures" },
  // Weight
  { value: "tons", label: "Tons" },
  { value: "lbs", label: "Pounds (lbs)" },
  // Volume
  { value: "gallons", label: "Gallons" },
  // Electrical
  { value: "circuits", label: "Circuits" },
  { value: "pulls", label: "Cable Pulls" },
  { value: "terminations", label: "Terminations" },
  // Mechanical/Plumbing
  { value: "joints", label: "Joints" },
  { value: "welds", label: "Welds" },
  { value: "hangers", label: "Hangers" },
  // Civil/Earthwork
  { value: "loads", label: "Loads" },
  { value: "piles", label: "Piles" },
  { value: "footings", label: "Footings" },
  // Time-based
  { value: "manhours", label: "Man-Hours" },
] as const;

interface ActivityFormProps {
  scopeId: string;
  onSuccess?: (activityId: string) => void;
}

export function ActivityForm({ scopeId, onSuccess }: ActivityFormProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createActivity = useMutation(api.activities.create);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !unit.trim()) return;

    setIsSubmitting(true);
    try {
      const activityId = await createActivity({
        scopeId: scopeId as Id<"scopes">,
        name: name.trim(),
        unit: unit.trim(),
        description: description.trim() || undefined,
      });
      setOpen(false);
      setName("");
      setUnit("");
      setDescription("");
      onSuccess?.(activityId);
    } catch (error) {
      console.error("Error creating activity:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Activity
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Activity</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="activityName">Activity Name</Label>
            <Input
              id="activityName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Underground Electrical, DC Cable Trenching"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="activityUnit">Unit of Measurement</Label>
            <Select value={unit} onValueChange={setUnit}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a unit" />
              </SelectTrigger>
              <SelectContent>
                {CONSTRUCTION_UNITS.map((u) => (
                  <SelectItem key={u.value} value={u.value}>
                    {u.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="activityDescription">Description (optional)</Label>
            <Input
              id="activityDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter activity description"
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
            <Button
              type="submit"
              disabled={isSubmitting || !name.trim() || !unit.trim()}
            >
              {isSubmitting ? "Adding..." : "Add Activity"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
