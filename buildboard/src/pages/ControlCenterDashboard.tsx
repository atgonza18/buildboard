import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Link } from "react-router-dom";
import { Id } from "../../convex/_generated/dataModel";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Building2,
  TrendingUp,
  Clock,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  ChevronDown,
  ChevronRight,
  Calendar,
  Trophy,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

// Helper to get local date string (YYYY-MM-DD) without timezone conversion
function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type TrendPeriod = "14d" | "30d";

export function ControlCenterDashboard() {
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>("14d");
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  const kpis = useQuery(api.dashboard.getAllProjectsKPIs);
  const projectsSummary = useQuery(api.dashboard.getProjectsSummary);
  const projects = useQuery(api.projects.list);
  const toggleLeaderboard = useMutation(api.projects.toggleLeaderboard);

  // Calculate date range based on selected period
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - (trendPeriod === "14d" ? 14 : 30));

  const trendData = useQuery(api.dashboard.getAllProjectsTrendData, {
    startDate: getLocalDateString(startDate),
    endDate: getLocalDateString(today),
  });

  // Get work logs for the last 7 days and 7 days into the future
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAhead = new Date(today);
  sevenDaysAhead.setDate(sevenDaysAhead.getDate() + 7);

  const workLogsByDate = useQuery(api.dashboard.getWorkLogsByDate, {
    startDate: getLocalDateString(sevenDaysAgo),
    endDate: getLocalDateString(sevenDaysAhead),
  });

  // Format trend data for charts
  const formattedTrendData =
    trendData?.map((d) => ({
      ...d,
      date: new Date(d.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
    })) ?? [];

  const toggleDateExpanded = (date: string) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDates(newExpanded);
  };

  const formatDate = (dateStr: string) => {
    const todayStr = getLocalDateString();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterdayDate);

    if (dateStr === todayStr) {
      return "Today";
    } else if (dateStr === yesterdayStr) {
      return "Yesterday";
    }
    const date = new Date(dateStr + "T12:00:00"); // Add time to avoid timezone issues
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const isLoading = !kpis || !projectsSummary;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
          Control Center
        </h1>
        <p className="text-slate-500 mt-1">
          Overview of all projects and production
        </p>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Active Projects"
          value={kpis.activeProjects}
          subValue={`${kpis.totalProjects} total`}
          icon={Building2}
        />
        <MetricCard
          label="Total Production"
          value={kpis.totalActualQuantity.toLocaleString()}
          subValue="units completed"
          icon={Target}
          trend={
            kpis.quantityVariance >= 0
              ? { direction: "up", value: `+${kpis.quantityVariance.toLocaleString()}` }
              : { direction: "down", value: kpis.quantityVariance.toLocaleString() }
          }
        />
        <MetricCard
          label="Hours Logged"
          value={kpis.totalActualHours.toLocaleString()}
          subValue={`${kpis.totalForecastHours.toLocaleString()} planned`}
          icon={Clock}
        />
        <MetricCard
          label="Production Rate"
          value={kpis.productionRate.toFixed(1)}
          subValue="units/hour"
          icon={TrendingUp}
        />
      </div>

      {/* Production Trend Chart */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-medium text-slate-900 dark:text-white">
            Production Trend
          </h3>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setTrendPeriod("14d")}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                trendPeriod === "14d"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              14 Days
            </button>
            <button
              onClick={() => setTrendPeriod("30d")}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                trendPeriod === "30d"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              30 Days
            </button>
          </div>
        </div>
        {formattedTrendData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formattedTrendData}>
                <defs>
                  <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={false}
                  width={50}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    fontSize: "12px",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                  formatter={(value: number) => [value.toLocaleString(), ""]}
                  labelStyle={{ fontWeight: 500 }}
                />
                <Area
                  type="monotone"
                  dataKey="forecastQuantity"
                  name="Forecast"
                  stroke="#94a3b8"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  fill="none"
                />
                <Area
                  type="monotone"
                  dataKey="actualQuantity"
                  name="Actual"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#actualGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState message="No trend data available" />
        )}
      </div>

      {/* Two Column Layout: Projects + Daily Production */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Performance */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
          <div className="px-5 py-4">
            <h3 className="text-sm font-medium text-slate-900 dark:text-white">
              Project Performance
            </h3>
          </div>
          {projectsSummary.length > 0 ? (
            <div className="px-5 pb-4 space-y-3">
              {projectsSummary.map((project) => {
                const projectData = projects?.find(p => p._id === project.projectId);
                const leaderboardEnabled = projectData?.leaderboardEnabled !== false; // Default true

                return (
                  <div
                    key={project.projectId}
                    className="p-3 rounded-lg border border-slate-100 dark:border-slate-800"
                  >
                    <Link
                      to={`/project/${project.projectId}`}
                      className="block hover:opacity-80 transition-opacity"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-slate-900 dark:text-white text-sm">
                          {project.name}
                        </span>
                        <StatusBadge status={project.status} />
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>{project.scopeCount} scopes</span>
                        <span className="text-slate-300 dark:text-slate-600">|</span>
                        <span>{project.totalActual.toLocaleString()} units</span>
                        <span className="text-slate-300 dark:text-slate-600">|</span>
                        <EfficiencyBadge value={project.efficiency} />
                      </div>
                    </Link>

                    {/* Leaderboard Mode Toggle */}
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {leaderboardEnabled ? (
                          <Trophy className="h-3.5 w-3.5 text-yellow-500" />
                        ) : (
                          <Users className="h-3.5 w-3.5 text-blue-500" />
                        )}
                        <span className="text-xs text-slate-600 dark:text-slate-400">
                          {leaderboardEnabled ? "Competitive Mode" : "Team Mode"}
                        </span>
                      </div>
                      <Switch
                        checked={leaderboardEnabled}
                        onCheckedChange={(checked) => {
                          void toggleLeaderboard({
                            projectId: project.projectId as Id<"projects">,
                            enabled: checked,
                          });
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-5 pb-4">
              <EmptyState message="No projects yet" />
            </div>
          )}
        </div>

        {/* Daily Production Log */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
          <div className="px-5 py-4 flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-900 dark:text-white">
              Daily Work Logs
            </h3>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                Forecast
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Actual
              </span>
            </div>
          </div>
          {workLogsByDate && workLogsByDate.length > 0 ? (
            <div className="px-5 pb-4 space-y-2">
              {workLogsByDate.map((day) => {
                const dayPF = day.totalForecast > 0
                  ? day.totalActual / day.totalForecast
                  : 0;
                const variance = day.totalActual - day.totalForecast;

                return (
                  <div
                    key={day.date}
                    className="border border-slate-100 dark:border-slate-800 rounded-lg overflow-hidden"
                  >
                    {/* Day Header */}
                    <button
                      onClick={() => toggleDateExpanded(day.date)}
                      className="w-full px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <Calendar size={14} className="text-slate-400" />
                          <span className="text-sm font-medium text-slate-900 dark:text-white">
                            {formatDate(day.date)}
                          </span>
                          <span className="text-xs text-slate-500">
                            {day.entryCount} {day.entryCount === 1 ? "entry" : "entries"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          {day.totalForecast > 0 && (
                            <span className={cn(
                              "text-xs font-medium px-2 py-0.5 rounded-full",
                              dayPF >= 1
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                            )}>
                              PF {dayPF.toFixed(2)}
                            </span>
                          )}
                          {expandedDates.has(day.date) ? (
                            <ChevronDown size={16} className="text-slate-400" />
                          ) : (
                            <ChevronRight size={16} className="text-slate-400" />
                          )}
                        </div>
                      </div>
                      {/* Forecast vs Actual Summary */}
                      <div className="grid grid-cols-3 gap-4 text-left">
                        <div>
                          <p className="text-xs text-slate-500 mb-0.5">Forecast</p>
                          <p className="text-sm font-medium text-blue-600 dark:text-blue-400 tabular-nums">
                            {day.totalForecast.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-0.5">Actual</p>
                          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
                            {day.totalActual.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-0.5">Variance</p>
                          <p className={cn(
                            "text-sm font-medium tabular-nums",
                            variance >= 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400"
                          )}>
                            {variance >= 0 ? "+" : ""}{variance.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </button>

                    {/* Expanded Entries */}
                    {expandedDates.has(day.date) && (
                      <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                        {day.entries.map((entry, idx) => {
                          const entryForecast = entry.forecastQuantity ?? 0;
                          const entryActual = entry.actualQuantity ?? 0;
                          const entryVariance = entryActual - entryForecast;
                          const entryPF = entryForecast > 0 ? entryActual / entryForecast : 0;
                          const progressPercent = entryForecast > 0
                            ? Math.min((entryActual / entryForecast) * 100, 150)
                            : 0;

                          return (
                            <div
                              key={entry._id}
                              className={cn(
                                "px-4 py-3",
                                idx !== day.entries.length - 1 &&
                                  "border-b border-slate-100 dark:border-slate-800"
                              )}
                            >
                              {/* Activity Info */}
                              <div className="flex items-start justify-between mb-2">
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                                    {entry.activityName}
                                  </p>
                                  <p className="text-xs text-slate-500 truncate">
                                    {entry.projectName} · {entry.scopeName}
                                  </p>
                                </div>
                                {entryForecast > 0 && (
                                  <span className={cn(
                                    "text-xs font-medium px-1.5 py-0.5 rounded ml-2",
                                    entryPF >= 1
                                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                  )}>
                                    {entryPF.toFixed(2)}
                                  </span>
                                )}
                              </div>

                              {/* Progress Bar */}
                              {entryForecast > 0 && (
                                <div className="mb-2">
                                  <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                      className={cn(
                                        "h-full rounded-full transition-all",
                                        entryPF >= 1 ? "bg-emerald-500" : "bg-amber-500"
                                      )}
                                      style={{ width: `${Math.min(progressPercent, 100)}%` }}
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Metrics Grid */}
                              <div className="grid grid-cols-4 gap-2">
                                <div>
                                  <p className="text-xs text-slate-400">Forecast</p>
                                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400 tabular-nums">
                                    {entryForecast.toLocaleString()} {entry.activityUnit}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-400">Actual</p>
                                  <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
                                    {entryActual.toLocaleString()} {entry.activityUnit}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-400">Variance</p>
                                  <p className={cn(
                                    "text-xs font-medium tabular-nums",
                                    entryVariance >= 0
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : "text-red-600 dark:text-red-400"
                                  )}>
                                    {entryVariance >= 0 ? "+" : ""}{entryVariance.toLocaleString()}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-400">Hours</p>
                                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400 tabular-nums">
                                    {(entry.actualHours ?? 0).toFixed(1)}h
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-5 pb-4">
              <EmptyState message="No work logs yet" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Metric Card Component
function MetricCard({
  label,
  value,
  subValue,
  icon: Icon,
  trend,
}: {
  label: string;
  value: string | number;
  subValue: string;
  icon: React.ElementType;
  trend?: { direction: "up" | "down"; value: string };
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          {label}
        </span>
        <Icon className="h-4 w-4 text-slate-400" />
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-slate-900 dark:text-white tabular-nums">
          {value}
        </span>
        {trend && (
          <span
            className={cn(
              "flex items-center text-xs font-medium",
              trend.direction === "up" ? "text-emerald-600" : "text-red-500"
            )}
          >
            {trend.direction === "up" ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {trend.value}
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500 mt-1">{subValue}</p>
    </div>
  );
}

// Status Badge
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
    completed: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    on_hold: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  };

  const labels: Record<string, string> = {
    active: "Active",
    completed: "Completed",
    on_hold: "On Hold",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
        styles[status] ?? styles.active
      )}
    >
      {labels[status] ?? status}
    </span>
  );
}

// Efficiency Badge
function EfficiencyBadge({ value }: { value: number }) {
  let colorClass = "text-slate-500";
  if (value >= 100) {
    colorClass = "text-emerald-600 dark:text-emerald-400";
  } else if (value >= 90) {
    colorClass = "text-slate-700 dark:text-slate-300";
  } else if (value < 80 && value > 0) {
    colorClass = "text-amber-600 dark:text-amber-400";
  }

  return (
    <span className={cn("font-medium tabular-nums", colorClass)}>
      {value > 0 ? `${value.toFixed(0)}% eff.` : "—"}
    </span>
  );
}

// Empty State
function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-slate-400">
      <Activity className="h-6 w-6 mb-2 opacity-50" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
