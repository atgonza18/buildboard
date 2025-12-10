import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { KPICard } from "@/components/dashboard/KPICard";
import { ActivityForm } from "@/components/forms/ActivityForm";
import {
  Target,
  TrendingUp,
  Clock,
  BarChart3,
  ArrowLeft,
  UserPlus,
  X,
  User,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface ScopePageProps {
  projectId: string;
  scopeId: string;
}

export function ScopePage({ projectId, scopeId }: ScopePageProps) {
  const [showAssignModal, setShowAssignModal] = useState(false);

  const scope = useQuery(api.scopes.getWithProject, {
    scopeId: scopeId as Id<"scopes">,
  });

  const scopeKPIs = useQuery(api.dashboard.getScopeKPIs, {
    scopeId: scopeId as Id<"scopes">,
  });

  const activities = useQuery(api.activities.listByScope, {
    scopeId: scopeId as Id<"scopes">,
  });

  const profile = useQuery(api.userProfiles.getCurrentProfile);
  const assignedCMs = useQuery(api.scopeAssignments.getByScopeId, {
    scopeId: scopeId as Id<"scopes">,
  });
  const availableCMs = useQuery(api.scopeAssignments.getAvailableCMs, {});

  const assignCM = useMutation(api.scopeAssignments.assign);
  const unassignCM = useMutation(api.scopeAssignments.unassign);

  const isControlCenter = profile?.role === "control_center";

  const handleAssign = async (userId: Id<"users">) => {
    await assignCM({ userId, scopeId: scopeId as Id<"scopes"> });
    setShowAssignModal(false);
  };

  const handleUnassign = async (userId: Id<"users">) => {
    await unassignCM({ userId, scopeId: scopeId as Id<"scopes"> });
  };

  // Filter out already assigned CMs from available list
  const unassignedCMs = availableCMs?.filter(
    (cm) => !assignedCMs?.some((assigned) => assigned.userId === cm.userId)
  );

  const formatJobTitle = (jobTitle?: string) => {
    if (!jobTitle) return "";
    return jobTitle
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  if (!scope) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button & Header */}
      <div className="flex items-center gap-4">
        <Link to={`/project/${projectId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {scope.name}
              </h1>
              {scope.description && (
                <p className="text-slate-500 mt-1">{scope.description}</p>
              )}
            </div>
            <ActivityForm scopeId={scopeId} />
          </div>
        </div>
      </div>

      {/* Assigned Construction Manager(s) */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-slate-900 dark:text-white">
            Assigned Construction Manager
          </h3>
          {isControlCenter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAssignModal(true)}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
            >
              <UserPlus size={16} className="mr-1" />
              Assign
            </Button>
          )}
        </div>

        {assignedCMs && assignedCMs.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {assignedCMs.map((cm) => (
              <div
                key={cm.userId}
                className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2"
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <User size={14} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {cm.name}
                  </p>
                  {cm.jobTitle && (
                    <p className="text-xs text-slate-500 truncate">
                      {formatJobTitle(cm.jobTitle)}
                    </p>
                  )}
                </div>
                {isControlCenter && (
                  <button
                    onClick={() => handleUnassign(cm.userId)}
                    className="ml-2 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            No construction manager assigned to this scope.
            {isControlCenter && " Click 'Assign' to add one."}
          </p>
        )}
      </div>

      {/* KPI Cards */}
      {scopeKPIs && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Forecast"
            value={scopeKPIs.totalForecastQuantity}
            subtitle="units planned"
            icon={Target}
          />
          <KPICard
            title="Actual"
            value={scopeKPIs.totalActualQuantity}
            subtitle="units completed"
            icon={TrendingUp}
            trend={scopeKPIs.quantityVariance >= 0 ? "up" : "down"}
            trendValue={`${scopeKPIs.quantityVariance >= 0 ? "+" : ""}${scopeKPIs.quantityVariance.toLocaleString()}`}
          />
          <KPICard
            title="Hours"
            value={scopeKPIs.totalActualHours.toFixed(1)}
            subtitle={`${scopeKPIs.totalForecastHours.toFixed(1)} planned`}
            icon={Clock}
          />
          <KPICard
            title="Production Rate"
            value={scopeKPIs.productionRate.toFixed(2)}
            subtitle="units per hour"
            icon={BarChart3}
          />
        </div>
      )}

      {/* Activities */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
        <div className="px-5 py-4 flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-900 dark:text-white">
            Activities
          </h3>
          <ActivityForm scopeId={scopeId} />
        </div>
        {activities && activities.length > 0 ? (
          <div className="px-5 pb-4 space-y-2">
            {activities.map((activity) => (
              <div
                key={activity._id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div>
                  <p className="font-medium text-slate-900 dark:text-white text-sm">
                    {activity.name}
                  </p>
                  <p className="text-xs text-slate-500">{activity.unit}</p>
                </div>
                <Link
                  to={`/project/${projectId}/entry`}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Enter Data
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 pb-4 text-center py-8">
            <p className="text-slate-500 mb-4 text-sm">
              No activities yet. Add activities to start tracking.
            </p>
            <ActivityForm scopeId={scopeId} />
          </div>
        )}
      </div>

      {/* Assign CM Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-medium text-slate-900 dark:text-white">
                Assign Construction Manager
              </h3>
              <button
                onClick={() => setShowAssignModal(false)}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5">
              {unassignedCMs && unassignedCMs.length > 0 ? (
                <div className="space-y-2">
                  {unassignedCMs.map((cm) => (
                    <button
                      key={cm.userId}
                      onClick={() => handleAssign(cm.userId)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <User size={18} className="text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 dark:text-white text-sm">
                          {cm.name}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {cm.email}
                          {cm.jobTitle && ` · ${formatJobTitle(cm.jobTitle)}`}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-center text-slate-500 py-4 text-sm">
                  No construction managers available to assign.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
