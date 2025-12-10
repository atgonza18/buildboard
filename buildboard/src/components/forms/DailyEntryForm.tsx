import { useState, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Users, Clock } from "lucide-react";

// Helper to get local date string (YYYY-MM-DD) without timezone conversion
function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

interface DailyEntryFormProps {
  projectId: string;
}

export function DailyEntryForm({ projectId }: DailyEntryFormProps) {
  const [selectedScope, setSelectedScope] = useState<string>("");
  const [selectedActivity, setSelectedActivity] = useState<string>("");
  const [date, setDate] = useState(getLocalDateString());
  const [forecastQuantity, setForecastQuantity] = useState("");
  const [forecastCrewSize, setForecastCrewSize] = useState("");
  const [forecastHoursPerWorker, setForecastHoursPerWorker] = useState("");
  const [actualQuantity, setActualQuantity] = useState("");
  const [actualCrewSize, setActualCrewSize] = useState("");
  const [actualHoursPerWorker, setActualHoursPerWorker] = useState("");
  const [activeTab, setActiveTab] = useState<"forecast" | "actuals">("forecast");
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");

  // Calculate man-hours in real-time
  const forecastManHours = useMemo(() => {
    const crew = parseFloat(forecastCrewSize);
    const hours = parseFloat(forecastHoursPerWorker);
    if (!isNaN(crew) && !isNaN(hours) && crew > 0 && hours > 0) {
      return crew * hours;
    }
    return null;
  }, [forecastCrewSize, forecastHoursPerWorker]);

  const actualManHours = useMemo(() => {
    const crew = parseFloat(actualCrewSize);
    const hours = parseFloat(actualHoursPerWorker);
    if (!isNaN(crew) && !isNaN(hours) && crew > 0 && hours > 0) {
      return crew * hours;
    }
    return null;
  }, [actualCrewSize, actualHoursPerWorker]);

  const scopes = useQuery(api.scopes.listByProject, {
    projectId: projectId as Id<"projects">,
  });

  const activities = useQuery(
    api.activities.listByScope,
    selectedScope ? { scopeId: selectedScope as Id<"scopes"> } : "skip"
  );

  const existingEntry = useQuery(
    api.dailyEntries.getByActivityAndDate,
    selectedActivity
      ? { activityId: selectedActivity as Id<"activities">, date }
      : "skip"
  );

  const submitForecast = useMutation(api.dailyEntries.submitForecast);
  const submitActuals = useMutation(api.dailyEntries.submitActuals);

  const selectedActivityData = activities?.find((a) => a._id === selectedActivity);

  const handleSubmitForecast = async () => {
    if (!selectedActivity || !forecastQuantity || !forecastCrewSize || !forecastHoursPerWorker) {
      setSubmitStatus("error");
      setStatusMessage("Please fill in all fields");
      return;
    }

    try {
      await submitForecast({
        activityId: selectedActivity as Id<"activities">,
        date,
        forecastQuantity: parseFloat(forecastQuantity),
        forecastCrewSize: parseFloat(forecastCrewSize),
        forecastHoursPerWorker: parseFloat(forecastHoursPerWorker),
      });
      setSubmitStatus("success");
      setStatusMessage("Forecast submitted successfully!");
      // Reset form
      setForecastQuantity("");
      setForecastCrewSize("");
      setForecastHoursPerWorker("");
    } catch {
      setSubmitStatus("error");
      setStatusMessage("Error submitting forecast");
    }
  };

  const handleSubmitActuals = async () => {
    if (!selectedActivity || !actualQuantity || !actualCrewSize || !actualHoursPerWorker) {
      setSubmitStatus("error");
      setStatusMessage("Please fill in all fields");
      return;
    }

    try {
      await submitActuals({
        activityId: selectedActivity as Id<"activities">,
        date,
        actualQuantity: parseFloat(actualQuantity),
        actualCrewSize: parseFloat(actualCrewSize),
        actualHoursPerWorker: parseFloat(actualHoursPerWorker),
      });
      setSubmitStatus("success");
      setStatusMessage("Actuals submitted successfully!");
      // Reset form
      setActualQuantity("");
      setActualCrewSize("");
      setActualHoursPerWorker("");
    } catch {
      setSubmitStatus("error");
      setStatusMessage("Error submitting actuals");
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Daily Entry</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Date Selection */}
        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        {/* Scope Selection */}
        <div className="space-y-2">
          <Label>Scope</Label>
          <Select
            value={selectedScope}
            onValueChange={(value) => {
              setSelectedScope(value);
              setSelectedActivity("");
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a scope" />
            </SelectTrigger>
            <SelectContent>
              {scopes?.map((scope) => (
                <SelectItem key={scope._id} value={scope._id}>
                  {scope.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Activity Selection */}
        <div className="space-y-2">
          <Label>Activity</Label>
          <Select
            value={selectedActivity}
            onValueChange={setSelectedActivity}
            disabled={!selectedScope}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an activity" />
            </SelectTrigger>
            <SelectContent>
              {activities?.map((activity) => (
                <SelectItem key={activity._id} value={activity._id}>
                  {activity.name} ({activity.unit})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Existing Entry Info */}
        {existingEntry && (
          <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
              Existing entry for this date:
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Forecast:</span>{" "}
                <span className="font-medium">
                  {existingEntry.forecastQuantity ?? "-"}{" "}
                  {selectedActivityData?.unit}
                </span>
                {existingEntry.forecastCrewSize && existingEntry.forecastHoursPerWorker && (
                  <span className="text-slate-400 ml-2">
                    ({existingEntry.forecastCrewSize} workers × {existingEntry.forecastHoursPerWorker}h = {existingEntry.forecastHours} man-hrs)
                  </span>
                )}
              </div>
              <div>
                <span className="text-slate-500">Actual:</span>{" "}
                <span className="font-medium">
                  {existingEntry.actualQuantity ?? "-"}{" "}
                  {selectedActivityData?.unit}
                </span>
                {existingEntry.actualCrewSize && existingEntry.actualHoursPerWorker && (
                  <span className="text-slate-400 ml-2">
                    ({existingEntry.actualCrewSize} workers × {existingEntry.actualHoursPerWorker}h = {existingEntry.actualHours} man-hrs)
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tabs for Forecast / Actuals */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "forecast" | "actuals")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="forecast">
              Forecast (Morning)
              {existingEntry?.forecastQuantity && (
                <CheckCircle className="ml-2 h-4 w-4 text-green-500" />
              )}
            </TabsTrigger>
            <TabsTrigger value="actuals">
              Actuals (End of Day)
              {existingEntry?.actualQuantity && (
                <CheckCircle className="ml-2 h-4 w-4 text-green-500" />
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="forecast" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="forecastQuantity">
                Forecast Quantity{" "}
                {selectedActivityData && (
                  <Badge variant="outline">{selectedActivityData.unit}</Badge>
                )}
              </Label>
              <Input
                id="forecastQuantity"
                type="number"
                placeholder="0"
                value={forecastQuantity}
                onChange={(e) => setForecastQuantity(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="forecastCrewSize" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Crew Size
                </Label>
                <Input
                  id="forecastCrewSize"
                  type="number"
                  min="1"
                  placeholder="# of workers"
                  value={forecastCrewSize}
                  onChange={(e) => setForecastCrewSize(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="forecastHoursPerWorker" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Hours/Worker
                </Label>
                <Input
                  id="forecastHoursPerWorker"
                  type="number"
                  step="0.5"
                  placeholder="Hours per person"
                  value={forecastHoursPerWorker}
                  onChange={(e) => setForecastHoursPerWorker(e.target.value)}
                />
              </div>
            </div>
            {/* Man-hours calculation display */}
            {forecastManHours !== null && (
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    Total Man-Hours:
                  </span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">
                    {forecastManHours.toFixed(1)} man-hrs
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {forecastCrewSize} workers × {forecastHoursPerWorker} hours
                </p>
              </div>
            )}
            <Button
              onClick={() => void handleSubmitForecast()}
              className="w-full"
              disabled={!selectedActivity}
            >
              Submit Forecast
            </Button>
          </TabsContent>

          <TabsContent value="actuals" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="actualQuantity">
                Actual Quantity{" "}
                {selectedActivityData && (
                  <Badge variant="outline">{selectedActivityData.unit}</Badge>
                )}
              </Label>
              <Input
                id="actualQuantity"
                type="number"
                placeholder="0"
                value={actualQuantity}
                onChange={(e) => setActualQuantity(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="actualCrewSize" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Crew Size
                </Label>
                <Input
                  id="actualCrewSize"
                  type="number"
                  min="1"
                  placeholder="# of workers"
                  value={actualCrewSize}
                  onChange={(e) => setActualCrewSize(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="actualHoursPerWorker" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Hours/Worker
                </Label>
                <Input
                  id="actualHoursPerWorker"
                  type="number"
                  step="0.5"
                  placeholder="Hours per person"
                  value={actualHoursPerWorker}
                  onChange={(e) => setActualHoursPerWorker(e.target.value)}
                />
              </div>
            </div>
            {/* Man-hours calculation display */}
            {actualManHours !== null && (
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    Total Man-Hours:
                  </span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">
                    {actualManHours.toFixed(1)} man-hrs
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {actualCrewSize} workers × {actualHoursPerWorker} hours
                </p>
              </div>
            )}
            <Button
              onClick={() => void handleSubmitActuals()}
              className="w-full"
              disabled={!selectedActivity}
            >
              Submit Actuals
            </Button>
          </TabsContent>
        </Tabs>

        {/* Status Message */}
        {submitStatus !== "idle" && (
          <div
            className={`flex items-center gap-2 p-4 rounded-lg ${
              submitStatus === "success"
                ? "bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200"
                : "bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200"
            }`}
          >
            {submitStatus === "success" ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
            <span>{statusMessage}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
