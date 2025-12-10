import { v } from "convex/values";
import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Check if user is Control Center
async function isControlCenter(ctx: any, userId: string): Promise<boolean> {
  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_userId", (q: any) => q.eq("userId", userId))
    .first();
  return profile?.role === "control_center";
}

// Get aggregated KPIs across ALL projects (Control Center only)
export const getAllProjectsKPIs = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const isCC = await isControlCenter(ctx, userId);
    if (!isCC) return null;

    const projects = await ctx.db.query("projects").collect();
    const allEntries = await ctx.db.query("dailyEntries").collect();

    let totalForecastQuantity = 0;
    let totalActualQuantity = 0;
    let totalForecastHours = 0;
    let totalActualHours = 0;

    for (const entry of allEntries) {
      totalForecastQuantity += entry.forecastQuantity ?? 0;
      totalActualQuantity += entry.actualQuantity ?? 0;
      totalForecastHours += entry.forecastHours ?? 0;
      totalActualHours += entry.actualHours ?? 0;
    }

    const productionRate =
      totalActualHours > 0 ? totalActualQuantity / totalActualHours : 0;
    const efficiency =
      totalForecastQuantity > 0
        ? (totalActualQuantity / totalForecastQuantity) * 100
        : 0;

    return {
      totalProjects: projects.length,
      activeProjects: projects.filter((p) => p.status === "active").length,
      totalForecastQuantity,
      totalActualQuantity,
      totalForecastHours,
      totalActualHours,
      quantityVariance: totalActualQuantity - totalForecastQuantity,
      hoursVariance: totalActualHours - totalForecastHours,
      productionRate,
      efficiency,
      totalEntries: allEntries.length,
    };
  },
});

// Get per-project summary for overview table (Control Center only)
export const getProjectsSummary = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const isCC = await isControlCenter(ctx, userId);
    if (!isCC) return [];

    const projects = await ctx.db.query("projects").collect();

    const summaries = await Promise.all(
      projects.map(async (project) => {
        const entries = await ctx.db
          .query("dailyEntries")
          .withIndex("by_project_and_date", (q) => q.eq("projectId", project._id))
          .collect();

        const scopes = await ctx.db
          .query("scopes")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect();

        let totalForecast = 0;
        let totalActual = 0;
        let totalHours = 0;

        for (const entry of entries) {
          totalForecast += entry.forecastQuantity ?? 0;
          totalActual += entry.actualQuantity ?? 0;
          totalHours += entry.actualHours ?? 0;
        }

        const efficiency =
          totalForecast > 0 ? (totalActual / totalForecast) * 100 : 0;

        return {
          projectId: project._id,
          name: project.name,
          status: project.status,
          scopeCount: scopes.length,
          totalForecast,
          totalActual,
          totalHours,
          efficiency,
          entriesCount: entries.length,
        };
      })
    );

    return summaries;
  },
});

// Get trend data across all projects (Control Center only)
export const getAllProjectsTrendData = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const isCC = await isControlCenter(ctx, userId);
    if (!isCC) return [];

    const allEntries = await ctx.db.query("dailyEntries").collect();

    // Filter by date range
    const filteredEntries = allEntries.filter(
      (e) => e.date >= args.startDate && e.date <= args.endDate
    );

    // Group by date
    const byDate: Record<
      string,
      {
        forecastQuantity: number;
        actualQuantity: number;
        forecastHours: number;
        actualHours: number;
      }
    > = {};

    for (const entry of filteredEntries) {
      if (!byDate[entry.date]) {
        byDate[entry.date] = {
          forecastQuantity: 0,
          actualQuantity: 0,
          forecastHours: 0,
          actualHours: 0,
        };
      }
      byDate[entry.date].forecastQuantity += entry.forecastQuantity ?? 0;
      byDate[entry.date].actualQuantity += entry.actualQuantity ?? 0;
      byDate[entry.date].forecastHours += entry.forecastHours ?? 0;
      byDate[entry.date].actualHours += entry.actualHours ?? 0;
    }

    return Object.entries(byDate)
      .map(([date, data]) => ({
        date,
        ...data,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },
});

// Get scope breakdown across all projects (Control Center only)
export const getAllScopesBreakdown = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const isCC = await isControlCenter(ctx, userId);
    if (!isCC) return [];

    const scopes = await ctx.db.query("scopes").collect();

    const breakdown = await Promise.all(
      scopes.map(async (scope) => {
        const project = await ctx.db.get(scope.projectId);
        const entries = await ctx.db
          .query("dailyEntries")
          .withIndex("by_scope_and_date", (q) => q.eq("scopeId", scope._id))
          .collect();

        let totalForecast = 0;
        let totalActual = 0;

        for (const entry of entries) {
          totalForecast += entry.forecastQuantity ?? 0;
          totalActual += entry.actualQuantity ?? 0;
        }

        return {
          scopeId: scope._id,
          scopeName: scope.name,
          projectId: scope.projectId,
          projectName: project?.name ?? "Unknown",
          totalForecast,
          totalActual,
          variance: totalActual - totalForecast,
        };
      })
    );

    return breakdown;
  },
});

// Helper to check project access
async function checkProjectAccess(ctx: any, userId: string, projectId: string) {
  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_userId", (q: any) => q.eq("userId", userId))
    .first();

  // If no profile, allow access (new user can view)
  if (!profile) return true;

  if (profile.role === "control_center") return true;

  const assignment = await ctx.db
    .query("projectAssignments")
    .withIndex("by_userId_and_projectId", (q: any) =>
      q.eq("userId", userId).eq("projectId", projectId)
    )
    .first();

  return !!assignment;
}

// Get KPIs for a project
export const getProjectKPIs = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const hasAccess = await checkProjectAccess(ctx, userId, args.projectId);
    if (!hasAccess) return null;

    const entries = await ctx.db
      .query("dailyEntries")
      .withIndex("by_project_and_date", (q) => q.eq("projectId", args.projectId))
      .collect();

    let totalForecastQuantity = 0;
    let totalActualQuantity = 0;
    let totalForecastHours = 0;
    let totalActualHours = 0;

    for (const entry of entries) {
      totalForecastQuantity += entry.forecastQuantity ?? 0;
      totalActualQuantity += entry.actualQuantity ?? 0;
      totalForecastHours += entry.forecastHours ?? 0;
      totalActualHours += entry.actualHours ?? 0;
    }

    const quantityVariance = totalActualQuantity - totalForecastQuantity;
    const hoursVariance = totalActualHours - totalForecastHours;
    const productionRate =
      totalActualHours > 0 ? totalActualQuantity / totalActualHours : 0;

    return {
      totalForecastQuantity,
      totalActualQuantity,
      totalForecastHours,
      totalActualHours,
      quantityVariance,
      hoursVariance,
      productionRate,
      entriesCount: entries.length,
    };
  },
});

// Get KPIs for a specific scope
export const getScopeKPIs = query({
  args: { scopeId: v.id("scopes") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const scope = await ctx.db.get(args.scopeId);
    if (!scope) return null;

    const hasAccess = await checkProjectAccess(ctx, userId, scope.projectId);
    if (!hasAccess) return null;

    const entries = await ctx.db
      .query("dailyEntries")
      .withIndex("by_scope_and_date", (q) => q.eq("scopeId", args.scopeId))
      .collect();

    let totalForecastQuantity = 0;
    let totalActualQuantity = 0;
    let totalForecastHours = 0;
    let totalActualHours = 0;

    for (const entry of entries) {
      totalForecastQuantity += entry.forecastQuantity ?? 0;
      totalActualQuantity += entry.actualQuantity ?? 0;
      totalForecastHours += entry.forecastHours ?? 0;
      totalActualHours += entry.actualHours ?? 0;
    }

    const quantityVariance = totalActualQuantity - totalForecastQuantity;
    const productionRate =
      totalActualHours > 0 ? totalActualQuantity / totalActualHours : 0;

    return {
      scopeName: scope.name,
      totalForecastQuantity,
      totalActualQuantity,
      totalForecastHours,
      totalActualHours,
      quantityVariance,
      productionRate,
      entriesCount: entries.length,
    };
  },
});

// Get all scope KPIs for a project (for dashboard overview)
export const getAllScopeKPIs = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const hasAccess = await checkProjectAccess(ctx, userId, args.projectId);
    if (!hasAccess) return [];

    const scopes = await ctx.db
      .query("scopes")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const scopeKPIs = await Promise.all(
      scopes.map(async (scope) => {
        const entries = await ctx.db
          .query("dailyEntries")
          .withIndex("by_scope_and_date", (q) => q.eq("scopeId", scope._id))
          .collect();

        let totalForecastQuantity = 0;
        let totalActualQuantity = 0;
        let totalForecastHours = 0;
        let totalActualHours = 0;

        for (const entry of entries) {
          totalForecastQuantity += entry.forecastQuantity ?? 0;
          totalActualQuantity += entry.actualQuantity ?? 0;
          totalForecastHours += entry.forecastHours ?? 0;
          totalActualHours += entry.actualHours ?? 0;
        }

        const productionRate =
          totalActualHours > 0 ? totalActualQuantity / totalActualHours : 0;

        return {
          scopeId: scope._id,
          scopeName: scope.name,
          totalForecastQuantity,
          totalActualQuantity,
          totalForecastHours,
          totalActualHours,
          quantityVariance: totalActualQuantity - totalForecastQuantity,
          productionRate,
          entriesCount: entries.length,
        };
      })
    );

    return scopeKPIs;
  },
});

// Get trend data for charts (daily Production Factor)
export const getTrendData = query({
  args: {
    projectId: v.id("projects"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const hasAccess = await checkProjectAccess(ctx, userId, args.projectId);
    if (!hasAccess) return [];

    const entries = await ctx.db
      .query("dailyEntries")
      .withIndex("by_project_and_date", (q) => q.eq("projectId", args.projectId))
      .collect();

    // Filter by date range
    const filteredEntries = entries.filter(
      (e) => e.date >= args.startDate && e.date <= args.endDate
    );

    // Group by date - we need to calculate PF per activity first, then aggregate
    // To properly calculate PF across different units, we weight by forecast quantity
    const byDate: Record<
      string,
      {
        totalForecast: number;
        totalActual: number;
        forecastHours: number;
        actualHours: number;
        // For weighted PF calculation
        weightedPFSum: number;
        weightSum: number;
      }
    > = {};

    for (const entry of filteredEntries) {
      if (!byDate[entry.date]) {
        byDate[entry.date] = {
          totalForecast: 0,
          totalActual: 0,
          forecastHours: 0,
          actualHours: 0,
          weightedPFSum: 0,
          weightSum: 0,
        };
      }

      const forecast = entry.forecastQuantity ?? 0;
      const actual = entry.actualQuantity ?? 0;

      byDate[entry.date].totalForecast += forecast;
      byDate[entry.date].totalActual += actual;
      byDate[entry.date].forecastHours += entry.forecastHours ?? 0;
      byDate[entry.date].actualHours += entry.actualHours ?? 0;

      // Calculate weighted PF - weight by forecast hours (man-hours is the common denominator)
      const forecastHours = entry.forecastHours ?? 0;
      if (forecast > 0 && forecastHours > 0) {
        const entryPF = actual / forecast;
        byDate[entry.date].weightedPFSum += entryPF * forecastHours;
        byDate[entry.date].weightSum += forecastHours;
      }
    }

    // Convert to array and calculate final PF for each date
    return Object.entries(byDate)
      .map(([date, data]) => ({
        date,
        productionFactor: data.weightSum > 0
          ? data.weightedPFSum / data.weightSum
          : 0,
        forecastHours: data.forecastHours,
        actualHours: data.actualHours,
        // Keep raw totals for reference (though mixing units)
        totalForecast: data.totalForecast,
        totalActual: data.totalActual,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },
});

// Get recent work logs for Control Center (daily entries with details)
export const getRecentWorkLogs = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const isCC = await isControlCenter(ctx, userId);
    if (!isCC) return [];

    const limit = args.limit ?? 50;

    // Get all entries sorted by date (most recent first)
    const allEntries = await ctx.db.query("dailyEntries").collect();

    // Sort by date descending, then by createdAt descending
    const sortedEntries = allEntries
      .sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        return (b.createdAt ?? 0) - (a.createdAt ?? 0);
      })
      .slice(0, limit);

    // Enrich with project, scope, activity details
    const enrichedLogs = await Promise.all(
      sortedEntries.map(async (entry) => {
        const activity = await ctx.db.get(entry.activityId);
        const scope = await ctx.db.get(entry.scopeId);
        const project = await ctx.db.get(entry.projectId);
        const userProfile = entry.createdBy
          ? await ctx.db
              .query("userProfiles")
              .withIndex("by_userId", (q) => q.eq("userId", entry.createdBy!))
              .first()
          : null;

        return {
          _id: entry._id,
          date: entry.date,
          projectName: project?.name ?? "Unknown",
          projectId: entry.projectId,
          scopeName: scope?.name ?? "Unknown",
          activityName: activity?.name ?? "Unknown",
          activityUnit: activity?.unit ?? "units",
          forecastQuantity: entry.forecastQuantity,
          forecastHours: entry.forecastHours,
          actualQuantity: entry.actualQuantity,
          actualHours: entry.actualHours,
          foremanName: entry.foremanName,
          createdByName: userProfile?.name ?? entry.foremanName ?? "Unknown",
          createdAt: entry.createdAt,
          notes: entry.notes,
        };
      })
    );

    return enrichedLogs;
  },
});

// Get work logs grouped by date for Control Center
// Note: Control Center sees all logs, CMs only see logs for their assigned projects
export const getWorkLogsByDate = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const isCC = await isControlCenter(ctx, userId);

    let allEntries;
    if (isCC) {
      // Control Center sees all entries
      allEntries = await ctx.db.query("dailyEntries").collect();
    } else {
      // Construction Manager sees only entries for their assigned projects
      const assignments = await ctx.db
        .query("projectAssignments")
        .withIndex("by_userId", (q: any) => q.eq("userId", userId))
        .collect();

      const projectIds = new Set(assignments.map(a => a.projectId.toString()));

      const entries = await ctx.db.query("dailyEntries").collect();
      allEntries = entries.filter(e => projectIds.has(e.projectId.toString()));
    }

    // Filter by date range
    const filteredEntries = allEntries.filter(
      (e) => e.date >= args.startDate && e.date <= args.endDate
    );

    // Group by date
    const byDate: Record<string, {
      date: string;
      entries: typeof filteredEntries;
      totalForecast: number;
      totalActual: number;
      totalForecastHours: number;
      totalActualHours: number;
    }> = {};

    for (const entry of filteredEntries) {
      if (!byDate[entry.date]) {
        byDate[entry.date] = {
          date: entry.date,
          entries: [],
          totalForecast: 0,
          totalActual: 0,
          totalForecastHours: 0,
          totalActualHours: 0,
        };
      }
      byDate[entry.date].entries.push(entry);
      byDate[entry.date].totalForecast += entry.forecastQuantity ?? 0;
      byDate[entry.date].totalActual += entry.actualQuantity ?? 0;
      byDate[entry.date].totalForecastHours += entry.forecastHours ?? 0;
      byDate[entry.date].totalActualHours += entry.actualHours ?? 0;
    }

    // Enrich and return sorted by date descending
    const enrichedDays = await Promise.all(
      Object.values(byDate).map(async (day) => {
        const enrichedEntries = await Promise.all(
          day.entries.map(async (entry) => {
            const activity = await ctx.db.get(entry.activityId);
            const scope = await ctx.db.get(entry.scopeId);
            const project = await ctx.db.get(entry.projectId);

            return {
              _id: entry._id,
              projectName: project?.name ?? "Unknown",
              scopeName: scope?.name ?? "Unknown",
              activityName: activity?.name ?? "Unknown",
              activityUnit: activity?.unit ?? "units",
              forecastQuantity: entry.forecastQuantity,
              actualQuantity: entry.actualQuantity,
              forecastHours: entry.forecastHours,
              actualHours: entry.actualHours,
              foremanName: entry.foremanName,
            };
          })
        );

        return {
          date: day.date,
          totalForecast: day.totalForecast,
          totalActual: day.totalActual,
          totalForecastHours: day.totalForecastHours,
          totalActualHours: day.totalActualHours,
          entryCount: day.entries.length,
          entries: enrichedEntries,
        };
      })
    );

    return enrichedDays.sort((a, b) => b.date.localeCompare(a.date));
  },
});

// Get activity-level KPIs
export const getActivityKPIs = query({
  args: { activityId: v.id("activities") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const activity = await ctx.db.get(args.activityId);
    if (!activity) return null;

    const hasAccess = await checkProjectAccess(ctx, userId, activity.projectId);
    if (!hasAccess) return null;

    const scope = await ctx.db.get(activity.scopeId);

    const entries = await ctx.db
      .query("dailyEntries")
      .withIndex("by_activity_and_date", (q) => q.eq("activityId", args.activityId))
      .collect();

    let totalForecastQuantity = 0;
    let totalActualQuantity = 0;
    let totalForecastHours = 0;
    let totalActualHours = 0;

    for (const entry of entries) {
      totalForecastQuantity += entry.forecastQuantity ?? 0;
      totalActualQuantity += entry.actualQuantity ?? 0;
      totalForecastHours += entry.forecastHours ?? 0;
      totalActualHours += entry.actualHours ?? 0;
    }

    const productionRate =
      totalActualHours > 0 ? totalActualQuantity / totalActualHours : 0;

    return {
      activityName: activity.name,
      activityUnit: activity.unit,
      scopeName: scope?.name ?? "Unknown",
      totalForecastQuantity,
      totalActualQuantity,
      totalForecastHours,
      totalActualHours,
      quantityVariance: totalActualQuantity - totalForecastQuantity,
      productionRate,
      entriesCount: entries.length,
    };
  },
});
