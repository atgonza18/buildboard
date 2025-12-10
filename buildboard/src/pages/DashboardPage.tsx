import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { KPICard } from "@/components/dashboard/KPICard";
import { ScopeCard } from "@/components/dashboard/ScopeCard";
import { TrendChart } from "@/components/charts/TrendChart";
import { ForecastVsActualsChart } from "@/components/charts/ForecastVsActualsChart";
import { ScopeForm } from "@/components/forms/ScopeForm";
import { Target, TrendingUp, Clock, Gauge } from "lucide-react";

// Helper to get local date string (YYYY-MM-DD) without timezone conversion
function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

interface DashboardPageProps {
  projectId: string;
}

export function DashboardPage({ projectId }: DashboardPageProps) {
  const project = useQuery(api.projects.getById, {
    projectId: projectId as Id<"projects">,
  });

  const kpis = useQuery(api.dashboard.getProjectKPIs, {
    projectId: projectId as Id<"projects">,
  });

  const scopeKPIs = useQuery(api.dashboard.getAllScopeKPIs, {
    projectId: projectId as Id<"projects">,
  });

  // Get trend data for the last 7 days plus 7 days into the future
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAhead = new Date(today);
  weekAhead.setDate(weekAhead.getDate() + 7);

  const trendData = useQuery(api.dashboard.getTrendData, {
    projectId: projectId as Id<"projects">,
    startDate: getLocalDateString(weekAgo),
    endDate: getLocalDateString(weekAhead),
  });

  if (!project) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">Loading project...</p>
      </div>
    );
  }

  // Prepare chart data for scopes
  const scopeChartData =
    scopeKPIs?.map((scope) => ({
      name: scope.scopeName,
      forecast: scope.totalForecastQuantity,
      actual: scope.totalActualQuantity,
    })) ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {project.name}
          </h1>
          {project.description && (
            <p className="text-slate-500 mt-1">{project.description}</p>
          )}
        </div>
        <ScopeForm projectId={projectId} />
      </div>

      {/* KPI Cards */}
      {kpis && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Production Factor"
            value={
              kpis.totalForecastQuantity > 0
                ? (kpis.totalActualQuantity / kpis.totalForecastQuantity).toFixed(2)
                : "0.00"
            }
            subtitle={
              kpis.totalForecastQuantity > 0
                ? kpis.totalActualQuantity / kpis.totalForecastQuantity >= 1.0
                  ? "on or above target"
                  : "below target"
                : "no forecast yet"
            }
            icon={Gauge}
            trend={
              kpis.totalForecastQuantity > 0
                ? kpis.totalActualQuantity / kpis.totalForecastQuantity >= 1.0
                  ? "up"
                  : "down"
                : undefined
            }
            trendValue={
              kpis.totalForecastQuantity > 0
                ? `${kpis.totalActualQuantity >= kpis.totalForecastQuantity ? "+" : ""}${(
                    ((kpis.totalActualQuantity - kpis.totalForecastQuantity) /
                      kpis.totalForecastQuantity) *
                    100
                  ).toFixed(1)}%`
                : undefined
            }
          />
          <KPICard
            title="Total Forecast"
            value={kpis.totalForecastQuantity}
            subtitle="units planned"
            icon={Target}
          />
          <KPICard
            title="Total Actual"
            value={kpis.totalActualQuantity}
            subtitle="units completed"
            icon={TrendingUp}
            trend={kpis.quantityVariance >= 0 ? "up" : "down"}
            trendValue={`${kpis.quantityVariance >= 0 ? "+" : ""}${kpis.quantityVariance.toLocaleString()}`}
          />
          <KPICard
            title="Hours Worked"
            value={kpis.totalActualHours.toFixed(1)}
            subtitle={`${kpis.totalForecastHours.toFixed(1)} planned`}
            icon={Clock}
          />
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        {trendData && trendData.length > 0 && (
          <TrendChart data={trendData} title="Production Factor Trend" />
        )}

        {/* Forecast vs Actuals by Scope */}
        {scopeChartData.length > 0 && (
          <ForecastVsActualsChart
            data={scopeChartData}
            title="Forecast vs Actuals by Scope"
          />
        )}
      </div>

      {/* Scope Cards */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Scopes
        </h2>
        {scopeKPIs && scopeKPIs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scopeKPIs.map((scope) => (
              <ScopeCard
                key={scope.scopeId}
                scopeId={scope.scopeId}
                scopeName={scope.scopeName}
                projectId={projectId}
                totalForecastQuantity={scope.totalForecastQuantity}
                totalActualQuantity={scope.totalActualQuantity}
                productionRate={scope.productionRate}
                entriesCount={scope.entriesCount}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
            <p className="text-slate-500 mb-4">No scopes created yet.</p>
            <ScopeForm projectId={projectId} />
          </div>
        )}
      </div>
    </div>
  );
}
