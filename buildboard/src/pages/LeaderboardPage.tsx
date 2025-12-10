import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Trophy,
  Medal,
  Award,
  TrendingUp,
  TrendingDown,
  Target,
  ChevronDown,
  ChevronRight,
  Layers,
  Activity,
  Zap,
  Users,
  BarChart3,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
  Tooltip,
} from "recharts";

interface LeaderboardPageProps {
  projectId: string;
}

export function LeaderboardPage({ projectId }: LeaderboardPageProps) {
  const [expandedScopes, setExpandedScopes] = useState<Set<string>>(new Set());
  const [animateProgress, setAnimateProgress] = useState(false);

  // Trigger animation after component mounts
  useEffect(() => {
    const timer = setTimeout(() => setAnimateProgress(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const leaderboard = useQuery(api.leaderboard.getProjectLeaderboard, {
    projectId: projectId as Id<"projects">,
  });

  const project = useQuery(api.projects.getById, {
    projectId: projectId as Id<"projects">,
  });

  const scopeBreakdown = useQuery(api.leaderboard.getScopeBreakdown, {
    projectId: projectId as Id<"projects">,
  });

  const toggleScope = (scopeId: string) => {
    setExpandedScopes((prev) => {
      const next = new Set(prev);
      if (next.has(scopeId)) {
        next.delete(scopeId);
      } else {
        next.add(scopeId);
      }
      return next;
    });
  };

  const getVarianceBadge = (variance: number, size: "sm" | "lg" = "sm") => {
    const sizeClasses = size === "lg" ? "text-sm px-3 py-1" : "text-xs px-2 py-0.5";
    if (variance > 0) {
      return (
        <Badge className={`bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 ${sizeClasses}`}>
          <TrendingUp className={size === "lg" ? "h-4 w-4 mr-1.5" : "h-3 w-3 mr-1"} />
          +{variance.toFixed(1)}%
        </Badge>
      );
    } else if (variance < 0) {
      return (
        <Badge className={`bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 ${sizeClasses}`}>
          <TrendingDown className={size === "lg" ? "h-4 w-4 mr-1.5" : "h-3 w-3 mr-1"} />
          {variance.toFixed(1)}%
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className={sizeClasses}>
        0%
      </Badge>
    );
  };

  const getPFColor = (pf: number) => {
    if (pf >= 1.1) return "text-emerald-600 dark:text-emerald-400";
    if (pf >= 1.0) return "text-green-600 dark:text-green-400";
    if (pf >= 0.9) return "text-yellow-600 dark:text-yellow-400";
    if (pf >= 0.8) return "text-orange-600 dark:text-orange-400";
    return "text-red-600 dark:text-red-400";
  };

  const getPFBgColor = (pf: number) => {
    if (pf >= 1.1) return "bg-emerald-500";
    if (pf >= 1.0) return "bg-green-500";
    if (pf >= 0.9) return "bg-yellow-500";
    if (pf >= 0.8) return "bg-orange-500";
    return "bg-red-500";
  };

  // Calculate project-wide stats
  const projectStats = leaderboard
    ? {
        totalForemen: leaderboard.length,
        avgPF:
          leaderboard.reduce((sum, e) => sum + (e.productionFactor ?? 0), 0) /
          (leaderboard.length || 1),
        topPF: leaderboard[0]?.productionFactor ?? 0,
        totalProduction: leaderboard.reduce(
          (sum, e) => sum + e.totalActualQuantity,
          0
        ),
        aboveTarget: leaderboard.filter((e) => (e.productionFactor ?? 0) >= 1.0)
          .length,
      }
    : null;

  if (!project) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <Trophy className="h-12 w-12 text-slate-300" />
          <p className="text-slate-500">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  const leaderboardEnabled = project.leaderboardEnabled !== false; // Default true
  const top3 = leaderboard?.slice(0, 3) ?? [];

  // Team Mode View (when leaderboard is disabled)
  if (!leaderboardEnabled) {
    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Team Performance
                </h1>
                <p className="text-slate-500 dark:text-slate-400">
                  {project.name} - Production Overview
                </p>
              </div>
            </div>
          </div>

          {/* Quick Stats Pills */}
          {projectStats && (
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-full px-4 py-2">
                <Users className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-medium">{projectStats.totalForemen} Team Members</span>
              </div>
              <div className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 rounded-full px-4 py-2">
                <BarChart3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  Team PF: {projectStats.avgPF.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Team Stats Card */}
        {projectStats && (
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {projectStats.avgPF.toFixed(2)}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Team Production Factor</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">
                    {projectStats.totalProduction.toLocaleString()}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Total Units Produced</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">
                    {projectStats.totalForemen}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Team Members</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                    {projectStats.aboveTarget}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Above Target</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Scope Breakdown (aggregate only, no individual names) */}
        <Card>
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b">
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-indigo-500" />
              Performance by Scope
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {scopeBreakdown && scopeBreakdown.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {scopeBreakdown.map((scope) => (
                  <div
                    key={scope.scopeId}
                    className="flex items-center gap-4 p-4"
                  >
                    <div className="flex-shrink-0">
                      <Layers className="h-5 w-5 text-indigo-500" />
                    </div>

                    <div className="flex-grow min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {scope.scopeName}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                        <span>{scope.activitiesCount} activities</span>
                        <span>&bull;</span>
                        <span>{scope.totalActualQuantity.toLocaleString()} / {scope.totalForecastQuantity.toLocaleString()} units</span>
                      </div>
                    </div>

                    <div className="flex-shrink-0 w-24 text-right">
                      <p className={`text-xl font-bold ${getPFColor(scope.productionFactor)}`}>
                        {scope.productionFactor.toFixed(2)}
                      </p>
                      <div className="mt-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getPFBgColor(scope.productionFactor)} transition-all duration-700 ease-out`}
                          style={{
                            width: animateProgress
                              ? `${Math.min(100, scope.productionFactor * 50)}%`
                              : "0%",
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      {getVarianceBadge(scope.variancePercent)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Layers className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                <p className="text-slate-500">No scope data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <Card className="bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-900 dark:to-slate-950 border-slate-700">
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-semibold text-white mb-2">
              Working together to exceed our targets
            </h3>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <div className="bg-slate-700/50 rounded-full px-4 py-1.5">
                <span className="text-slate-300 text-sm">Team PF &gt; 1.0 = Exceeding expectations</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Competitive Mode View (original leaderboard)
  return (
    <div className="space-y-8">
      {/* Header with Project Stats */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <Trophy className="h-6 w-6 text-yellow-600 dark:text-yellow-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Leaderboard
              </h1>
              <p className="text-slate-500 dark:text-slate-400">
                {project.name} - Production Factor Rankings
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats Pills */}
        {projectStats && (
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-full px-4 py-2">
              <Users className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-medium">{projectStats.totalForemen} Foremen</span>
            </div>
            <div className="flex items-center gap-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-full px-4 py-2">
              <Target className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                {projectStats.aboveTarget}/{projectStats.totalForemen} Above Target
              </span>
            </div>
            <div className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 rounded-full px-4 py-2">
              <BarChart3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Avg PF: {projectStats.avgPF.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Hero Podium Section */}
      {top3.length > 0 && (
        <div className="relative">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-100 via-slate-50 to-transparent dark:from-slate-800/50 dark:via-slate-900/30 dark:to-transparent rounded-3xl -z-10" />

          <div className="pt-8 pb-4 px-4">
            {/* Podium Layout */}
            <div className="flex justify-center items-end gap-4 lg:gap-8 mb-6">
              {/* 2nd Place */}
              {top3[1] && (
                <div className="flex flex-col items-center w-full max-w-[200px]">
                  <div className="relative mb-3">
                    <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-500 dark:to-slate-600 flex items-center justify-center shadow-lg ring-2 ring-slate-200 dark:ring-slate-700">
                      <Medal className="h-7 w-7 lg:h-8 lg:w-8 text-white" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-slate-200 dark:bg-slate-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold text-slate-700 dark:text-white shadow">
                      2
                    </div>
                  </div>
                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 w-full shadow-lg border border-slate-200 dark:border-slate-700 text-center">
                    <p className="font-bold text-slate-900 dark:text-white truncate">
                      {top3[1].foremanName}
                    </p>
                    <p className={`text-2xl font-black mt-1 ${getPFColor(top3[1].productionFactor ?? 0)}`}>
                      {(top3[1].productionFactor ?? 0).toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Production Factor</p>
                    <div className="mt-2">
                      {getVarianceBadge(top3[1].variancePercent)}
                    </div>
                  </div>
                  <div className="h-20 lg:h-24 w-full bg-gradient-to-t from-slate-300 to-slate-200 dark:from-slate-600 dark:to-slate-500 rounded-t-lg mt-3" />
                </div>
              )}

              {/* 1st Place */}
              {top3[0] && (
                <div className="flex flex-col items-center w-full max-w-[220px] -mt-6">
                  <div className="relative mb-3">
                    <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg ring-2 ring-yellow-200 dark:ring-yellow-700">
                      <Trophy className="h-8 w-8 lg:h-10 lg:w-10 text-white" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-yellow-500 rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold text-white shadow">
                      1
                    </div>
                  </div>
                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 w-full shadow-lg border border-yellow-200 dark:border-yellow-700 text-center">
                    <p className="font-bold text-lg text-slate-900 dark:text-white truncate">
                      {top3[0].foremanName}
                    </p>
                    <p className={`text-3xl font-bold mt-2 ${getPFColor(top3[0].productionFactor ?? 0)}`}>
                      {(top3[0].productionFactor ?? 0).toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Production Factor</p>
                    <div className="mt-3">
                      {getVarianceBadge(top3[0].variancePercent, "lg")}
                    </div>
                    <div className="flex justify-center gap-2 mt-3 text-xs text-slate-500">
                      <span>{top3[0].activitiesCount} activities</span>
                      <span>&bull;</span>
                      <span>{top3[0].totalActualQuantity.toLocaleString()} units</span>
                    </div>
                  </div>
                  <div className="h-28 lg:h-32 w-full bg-gradient-to-t from-yellow-500 to-yellow-400 dark:from-yellow-700 dark:to-yellow-600 rounded-t-lg mt-3" />
                </div>
              )}

              {/* 3rd Place */}
              {top3[2] && (
                <div className="flex flex-col items-center w-full max-w-[200px]">
                  <div className="relative mb-3">
                    <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-full bg-gradient-to-br from-amber-600 to-amber-700 dark:from-amber-700 dark:to-amber-800 flex items-center justify-center shadow-lg ring-2 ring-amber-300 dark:ring-amber-700">
                      <Award className="h-7 w-7 lg:h-8 lg:w-8 text-white" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-amber-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold text-white shadow">
                      3
                    </div>
                  </div>
                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 w-full shadow-lg border border-amber-200 dark:border-amber-800 text-center">
                    <p className="font-bold text-slate-900 dark:text-white truncate">
                      {top3[2].foremanName}
                    </p>
                    <p className={`text-2xl font-black mt-1 ${getPFColor(top3[2].productionFactor ?? 0)}`}>
                      {(top3[2].productionFactor ?? 0).toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Production Factor</p>
                    <div className="mt-2">
                      {getVarianceBadge(top3[2].variancePercent)}
                    </div>
                  </div>
                  <div className="h-16 lg:h-20 w-full bg-gradient-to-t from-amber-600 to-amber-500 dark:from-amber-700 dark:to-amber-600 rounded-t-lg mt-3" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rest of Rankings + Scope Breakdown - Side by Side */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Rankings Table */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-b">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              Full Rankings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {leaderboard && leaderboard.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {leaderboard.map((entry, index) => (
                  <div
                    key={`${entry.foremanName}-${index}`}
                    className={`flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                      entry.rank <= 3 ? "bg-slate-50/50 dark:bg-slate-800/30" : ""
                    }`}
                  >
                    {/* Rank */}
                    <div className="flex-shrink-0 w-10">
                      {entry.rank === 1 && (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
                          <Trophy className="h-5 w-5 text-white" />
                        </div>
                      )}
                      {entry.rank === 2 && (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center">
                          <Medal className="h-5 w-5 text-white" />
                        </div>
                      )}
                      {entry.rank === 3 && (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                          <Award className="h-5 w-5 text-white" />
                        </div>
                      )}
                      {entry.rank > 3 && (
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">
                          {entry.rank}
                        </div>
                      )}
                    </div>

                    {/* Name & Scopes */}
                    <div className="flex-grow min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">
                        {entry.foremanName}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {entry.scopeNames?.slice(0, 2).map((scope, i) => (
                          <Badge
                            key={i}
                            variant="secondary"
                            className="text-xs bg-slate-100 dark:bg-slate-700"
                          >
                            {scope}
                          </Badge>
                        ))}
                        {(entry.scopeNames?.length ?? 0) > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{(entry.scopeNames?.length ?? 0) - 2}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* PF with mini progress bar */}
                    <div className="flex-shrink-0 w-32 text-right">
                      <p className={`text-xl font-bold ${getPFColor(entry.productionFactor ?? 0)}`}>
                        {(entry.productionFactor ?? 0).toFixed(2)}
                      </p>
                      <div className="mt-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getPFBgColor(entry.productionFactor ?? 0)} transition-all duration-700 ease-out`}
                          style={{
                            width: animateProgress
                              ? `${Math.min(100, (entry.productionFactor ?? 0) * 50)}%`
                              : "0%",
                            transitionDelay: `${index * 50}ms`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Variance */}
                    <div className="flex-shrink-0">
                      {getVarianceBadge(entry.variancePercent)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <Trophy className="mx-auto h-16 w-16 text-slate-300 dark:text-slate-600 mb-4" />
                <p className="text-slate-500 dark:text-slate-400 text-lg">
                  No data yet
                </p>
                <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">
                  Start entering daily actuals to see rankings
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scope Breakdown with Inline Activities */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b">
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-indigo-500" />
                PF by Scope
                <span className="text-sm font-normal text-slate-500 ml-2">
                  Click to expand activities
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {scopeBreakdown && scopeBreakdown.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {scopeBreakdown.map((scope) => (
                    <ScopeRow
                      key={scope.scopeId}
                      scope={scope}
                      isExpanded={expandedScopes.has(scope.scopeId)}
                      onToggle={() => toggleScope(scope.scopeId)}
                      getPFColor={getPFColor}
                      getPFBgColor={getPFBgColor}
                      getVarianceBadge={getVarianceBadge}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Layers className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                  <p className="text-slate-500">No scope data available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mini Chart for Top Performers */}
          {leaderboard && leaderboard.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  Performance Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={leaderboard.slice(0, 8).map((e) => ({
                        name: e.foremanName.split(" ")[0],
                        pf: e.productionFactor ?? 0,
                        rank: e.rank,
                      }))}
                      layout="vertical"
                      margin={{ top: 0, right: 20, left: 60, bottom: 0 }}
                    >
                      <XAxis
                        type="number"
                        domain={[0, "auto"]}
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        axisLine={false}
                        tickLine={false}
                        width={55}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#fff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        formatter={(value: number) => [
                          value.toFixed(2),
                          "Production Factor",
                        ]}
                      />
                      <Bar
                        dataKey="pf"
                        radius={[0, 4, 4, 0]}
                        animationDuration={800}
                        animationEasing="ease-out"
                      >
                        {leaderboard.slice(0, 8).map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              entry.rank === 1
                                ? "#fbbf24"
                                : entry.rank === 2
                                  ? "#94a3b8"
                                  : entry.rank === 3
                                    ? "#d97706"
                                    : "#3b82f6"
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Motivational Footer */}
      {leaderboard && leaderboard.length > 0 && (
        <Card className="bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-900 dark:to-slate-950 border-slate-700">
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-semibold text-white mb-2">
              Beat your forecast to climb the rankings
            </h3>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <div className="bg-slate-700/50 rounded-full px-4 py-1.5">
                <span className="text-slate-300 text-sm">PF &gt; 1.0 = Exceeding expectations</span>
              </div>
              <div className="bg-slate-700/50 rounded-full px-4 py-1.5">
                <span className="text-slate-300 text-sm">Higher PF = Better ranking</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Scope Row Component with Activity Expansion
function ScopeRow({
  scope,
  isExpanded,
  onToggle,
  getPFColor,
  getPFBgColor,
  getVarianceBadge,
}: {
  scope: {
    scopeId: string;
    scopeName: string;
    productionFactor: number;
    variancePercent: number;
    totalForecastQuantity: number;
    totalActualQuantity: number;
    activitiesCount: number;
    foremenNames: string[];
  };
  isExpanded: boolean;
  onToggle: () => void;
  getPFColor: (pf: number) => string;
  getPFBgColor: (pf: number) => string;
  getVarianceBadge: (variance: number, size?: "sm" | "lg") => React.ReactNode;
}) {
  const activityBreakdown = useQuery(
    api.leaderboard.getActivityBreakdown,
    isExpanded ? { scopeId: scope.scopeId as Id<"scopes"> } : "skip"
  );

  return (
    <div>
      {/* Scope Header Row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
      >
        <div className="flex-shrink-0">
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-slate-400" />
          ) : (
            <ChevronRight className="h-5 w-5 text-slate-400" />
          )}
        </div>

        <div className="flex-grow min-w-0">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-indigo-500" />
            <p className="font-semibold text-slate-900 dark:text-white">
              {scope.scopeName}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
            <span>{scope.activitiesCount} activities</span>
            <span>&bull;</span>
            <span>{scope.foremenNames.length} foremen</span>
          </div>
        </div>

        <div className="flex-shrink-0 w-24 text-right">
          <p className={`text-xl font-bold ${getPFColor(scope.productionFactor)}`}>
            {scope.productionFactor.toFixed(2)}
          </p>
          <div className="mt-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${getPFBgColor(scope.productionFactor)} transition-all`}
              style={{
                width: `${Math.min(100, scope.productionFactor * 50)}%`,
              }}
            />
          </div>
        </div>

        <div className="flex-shrink-0">
          {getVarianceBadge(scope.variancePercent)}
        </div>
      </button>

      {/* Expanded Activity List */}
      {isExpanded && (
        <div className="bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-700">
          {activityBreakdown && activityBreakdown.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {activityBreakdown.map((activity) => (
                <div
                  key={activity.activityId}
                  className="flex items-center gap-4 px-4 py-3 pl-12"
                >
                  <Activity className="h-4 w-4 text-slate-400 flex-shrink-0" />

                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-700 dark:text-slate-300 truncate">
                        {activity.activityName}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {activity.unit}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      <span>
                        {activity.totalActualQuantity.toLocaleString()} / {activity.totalForecastQuantity.toLocaleString()} {activity.unit}
                      </span>
                      <span>&bull;</span>
                      <span>{activity.totalActualHours.toLocaleString()} hrs</span>
                    </div>
                  </div>

                  <div className="flex-shrink-0 w-20">
                    <div className="flex items-center gap-2">
                      <div className="flex-grow">
                        <Progress
                          value={Math.min(100, activity.productionFactor * 50)}
                          className="h-2"
                        />
                      </div>
                      <span className={`text-sm font-bold ${getPFColor(activity.productionFactor)}`}>
                        {activity.productionFactor.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    {getVarianceBadge(activity.variancePercent)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-12 py-6 text-center text-slate-500 text-sm">
              {activityBreakdown ? "No activity data" : "Loading activities..."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
