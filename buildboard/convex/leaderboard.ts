import { v } from "convex/values";
import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

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

// Get leaderboard for a project (ranked by Production Factor - industry standard metric)
// PF = Actual Production / Forecasted Production
// PF > 1.0 = exceeded forecast (good), PF < 1.0 = below forecast (needs improvement)
// Groups by foremanName to show individual foreman/construction manager performance
export const getProjectLeaderboard = query({
  args: {
    projectId: v.id("projects"),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const hasAccess = await checkProjectAccess(ctx, userId, args.projectId);
    if (!hasAccess) return [];

    // Get all entries for this project
    let entries = await ctx.db
      .query("dailyEntries")
      .withIndex("by_project_and_date", (q) => q.eq("projectId", args.projectId))
      .collect();

    // Filter by date range if provided
    if (args.startDate && args.endDate) {
      entries = entries.filter(
        (e) => e.date >= args.startDate! && e.date <= args.endDate!
      );
    }

    // Group by foreman name (for proper leaderboard display)
    const byForeman: Record<
      string,
      {
        totalActualQuantity: number;
        totalActualHours: number;
        totalForecastQuantity: number;
        totalForecastHours: number;
        entriesCount: number;
        activitiesWorked: Set<string>;
        scopesWorked: Set<string>;
      }
    > = {};

    for (const entry of entries) {
      // Use foremanName if available, fall back to looking up user profile
      const foremanKey = entry.foremanName ?? entry.userId;
      if (!byForeman[foremanKey]) {
        byForeman[foremanKey] = {
          totalActualQuantity: 0,
          totalActualHours: 0,
          totalForecastQuantity: 0,
          totalForecastHours: 0,
          entriesCount: 0,
          activitiesWorked: new Set(),
          scopesWorked: new Set(),
        };
      }
      byForeman[foremanKey].totalActualQuantity += entry.actualQuantity ?? 0;
      byForeman[foremanKey].totalActualHours += entry.actualHours ?? 0;
      byForeman[foremanKey].totalForecastQuantity += entry.forecastQuantity ?? 0;
      byForeman[foremanKey].totalForecastHours += entry.forecastHours ?? 0;
      byForeman[foremanKey].entriesCount += 1;
      byForeman[foremanKey].activitiesWorked.add(entry.activityId);
      byForeman[foremanKey].scopesWorked.add(entry.scopeId);
    }

    // Build leaderboard
    const leaderboard = await Promise.all(
      Object.entries(byForeman).map(async ([foremanKey, data]) => {
        // Check if foremanKey looks like a user ID (starts with convex ID format)
        let foremanName = foremanKey;
        if (foremanKey.includes(":")) {
          // It's a user ID, look up the profile
          const profile = await ctx.db
            .query("userProfiles")
            .withIndex("by_userId", (q) => q.eq("userId", foremanKey as any))
            .first();
          foremanName = profile?.name ?? "Unknown";
        }

        // Get scope names for this foreman
        const scopeNames: string[] = [];
        for (const scopeId of data.scopesWorked) {
          const scope = await ctx.db.get(scopeId as Id<"scopes">);
          if (scope && "name" in scope) {
            scopeNames.push(scope.name);
          }
        }

        const productionRate =
          data.totalActualHours > 0
            ? data.totalActualQuantity / data.totalActualHours
            : 0;

        // Production Factor (PF) = Actual / Forecast
        // Industry standard metric for construction performance
        // PF > 1.0 = exceeded forecast (good), PF < 1.0 = below forecast
        const productionFactor = data.totalForecastQuantity > 0
          ? data.totalActualQuantity / data.totalForecastQuantity
          : 0;

        // Variance percentage for reference
        const variancePercent = data.totalForecastQuantity > 0
          ? ((data.totalActualQuantity - data.totalForecastQuantity) / data.totalForecastQuantity) * 100
          : 0;

        return {
          foremanName,
          scopeNames,
          totalActualQuantity: data.totalActualQuantity,
          totalActualHours: data.totalActualHours,
          totalForecastQuantity: data.totalForecastQuantity,
          totalForecastHours: data.totalForecastHours,
          productionRate: Math.round(productionRate * 100) / 100,
          productionFactor: Math.round(productionFactor * 100) / 100,
          variancePercent: Math.round(variancePercent * 10) / 10,
          entriesCount: data.entriesCount,
          activitiesCount: data.activitiesWorked.size,
        };
      })
    );

    // Sort by Production Factor descending (highest PF = best ranking)
    leaderboard.sort((a, b) => b.productionFactor - a.productionFactor);

    // Add rank
    return leaderboard.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
  },
});

// Get leaderboard by scope (ranked by Production Factor)
export const getScopeLeaderboard = query({
  args: {
    scopeId: v.id("scopes"),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const scope = await ctx.db.get(args.scopeId);
    if (!scope) return [];

    const hasAccess = await checkProjectAccess(ctx, userId, scope.projectId);
    if (!hasAccess) return [];

    // Get all entries for this scope
    let entries = await ctx.db
      .query("dailyEntries")
      .withIndex("by_scope_and_date", (q) => q.eq("scopeId", args.scopeId))
      .collect();

    // Filter by date range if provided
    if (args.startDate && args.endDate) {
      entries = entries.filter(
        (e) => e.date >= args.startDate! && e.date <= args.endDate!
      );
    }

    // Group by foreman name
    const byForeman: Record<
      string,
      {
        totalActualQuantity: number;
        totalActualHours: number;
        totalForecastQuantity: number;
        totalForecastHours: number;
        entriesCount: number;
      }
    > = {};

    for (const entry of entries) {
      const foremanKey = entry.foremanName ?? entry.userId;
      if (!byForeman[foremanKey]) {
        byForeman[foremanKey] = {
          totalActualQuantity: 0,
          totalActualHours: 0,
          totalForecastQuantity: 0,
          totalForecastHours: 0,
          entriesCount: 0,
        };
      }
      byForeman[foremanKey].totalActualQuantity += entry.actualQuantity ?? 0;
      byForeman[foremanKey].totalActualHours += entry.actualHours ?? 0;
      byForeman[foremanKey].totalForecastQuantity += entry.forecastQuantity ?? 0;
      byForeman[foremanKey].totalForecastHours += entry.forecastHours ?? 0;
      byForeman[foremanKey].entriesCount += 1;
    }

    // Build leaderboard
    const leaderboard = await Promise.all(
      Object.entries(byForeman).map(async ([foremanKey, data]) => {
        let foremanName = foremanKey;
        if (foremanKey.includes(":")) {
          const profile = await ctx.db
            .query("userProfiles")
            .withIndex("by_userId", (q) => q.eq("userId", foremanKey as any))
            .first();
          foremanName = profile?.name ?? "Unknown";
        }

        const productionRate =
          data.totalActualHours > 0
            ? data.totalActualQuantity / data.totalActualHours
            : 0;

        const productionFactor = data.totalForecastQuantity > 0
          ? data.totalActualQuantity / data.totalForecastQuantity
          : 0;

        const variancePercent = data.totalForecastQuantity > 0
          ? ((data.totalActualQuantity - data.totalForecastQuantity) / data.totalForecastQuantity) * 100
          : 0;

        return {
          foremanName,
          totalActualQuantity: data.totalActualQuantity,
          totalActualHours: data.totalActualHours,
          totalForecastQuantity: data.totalForecastQuantity,
          totalForecastHours: data.totalForecastHours,
          productionRate: Math.round(productionRate * 100) / 100,
          productionFactor: Math.round(productionFactor * 100) / 100,
          variancePercent: Math.round(variancePercent * 10) / 10,
          entriesCount: data.entriesCount,
        };
      })
    );

    // Sort by Production Factor descending (highest PF = best ranking)
    leaderboard.sort((a, b) => b.productionFactor - a.productionFactor);

    // Add rank
    return leaderboard.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
  },
});

// Get individual user stats for a project
export const getUserStats = query({
  args: {
    projectId: v.id("projects"),
    targetUserId: v.id("users"),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const hasAccess = await checkProjectAccess(ctx, userId, args.projectId);
    if (!hasAccess) return null;

    // Get entries for the target user
    let entries = await ctx.db
      .query("dailyEntries")
      .withIndex("by_user_and_date", (q) => q.eq("userId", args.targetUserId))
      .collect();

    // Filter by project and date range
    entries = entries.filter((e) => e.projectId === args.projectId);

    if (args.startDate && args.endDate) {
      entries = entries.filter(
        (e) => e.date >= args.startDate! && e.date <= args.endDate!
      );
    }

    let totalActualQuantity = 0;
    let totalActualHours = 0;
    let totalForecastQuantity = 0;
    let totalForecastHours = 0;

    for (const entry of entries) {
      totalActualQuantity += entry.actualQuantity ?? 0;
      totalActualHours += entry.actualHours ?? 0;
      totalForecastQuantity += entry.forecastQuantity ?? 0;
      totalForecastHours += entry.forecastHours ?? 0;
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.targetUserId))
      .first();

    const productionRate =
      totalActualHours > 0 ? totalActualQuantity / totalActualHours : 0;

    return {
      userId: args.targetUserId,
      userName: profile?.name ?? "Unknown",
      role: profile?.role ?? "construction_manager",
      totalActualQuantity,
      totalActualHours,
      totalForecastQuantity,
      totalForecastHours,
      productionRate,
      variance: totalActualQuantity - totalForecastQuantity,
      entriesCount: entries.length,
    };
  },
});

// Get PF breakdown by scope for a project (for Control Center drill-down)
export const getScopeBreakdown = query({
  args: {
    projectId: v.id("projects"),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const hasAccess = await checkProjectAccess(ctx, userId, args.projectId);
    if (!hasAccess) return [];

    // Get all scopes for this project
    const scopes = await ctx.db
      .query("scopes")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    // Get all entries for this project
    let entries = await ctx.db
      .query("dailyEntries")
      .withIndex("by_project_and_date", (q) => q.eq("projectId", args.projectId))
      .collect();

    // Filter by date range if provided
    if (args.startDate && args.endDate) {
      entries = entries.filter(
        (e) => e.date >= args.startDate! && e.date <= args.endDate!
      );
    }

    // Group by scope
    const byScope: Record<
      string,
      {
        totalActualQuantity: number;
        totalForecastQuantity: number;
        totalActualHours: number;
        totalForecastHours: number;
        entriesCount: number;
        activitiesWorked: Set<string>;
        foremenWorked: Set<string>;
      }
    > = {};

    for (const entry of entries) {
      const scopeId = entry.scopeId;
      if (!byScope[scopeId]) {
        byScope[scopeId] = {
          totalActualQuantity: 0,
          totalForecastQuantity: 0,
          totalActualHours: 0,
          totalForecastHours: 0,
          entriesCount: 0,
          activitiesWorked: new Set(),
          foremenWorked: new Set(),
        };
      }
      byScope[scopeId].totalActualQuantity += entry.actualQuantity ?? 0;
      byScope[scopeId].totalForecastQuantity += entry.forecastQuantity ?? 0;
      byScope[scopeId].totalActualHours += entry.actualHours ?? 0;
      byScope[scopeId].totalForecastHours += entry.forecastHours ?? 0;
      byScope[scopeId].entriesCount += 1;
      byScope[scopeId].activitiesWorked.add(entry.activityId);
      if (entry.foremanName) {
        byScope[scopeId].foremenWorked.add(entry.foremanName);
      }
    }

    // Build breakdown
    const breakdown = scopes.map((scope) => {
      const data = byScope[scope._id] ?? {
        totalActualQuantity: 0,
        totalForecastQuantity: 0,
        totalActualHours: 0,
        totalForecastHours: 0,
        entriesCount: 0,
        activitiesWorked: new Set(),
        foremenWorked: new Set(),
      };

      const productionFactor = data.totalForecastQuantity > 0
        ? data.totalActualQuantity / data.totalForecastQuantity
        : 0;

      const variancePercent = data.totalForecastQuantity > 0
        ? ((data.totalActualQuantity - data.totalForecastQuantity) / data.totalForecastQuantity) * 100
        : 0;

      return {
        scopeId: scope._id,
        scopeName: scope.name,
        totalActualQuantity: data.totalActualQuantity,
        totalForecastQuantity: data.totalForecastQuantity,
        totalActualHours: data.totalActualHours,
        totalForecastHours: data.totalForecastHours,
        productionFactor: Math.round(productionFactor * 100) / 100,
        variancePercent: Math.round(variancePercent * 10) / 10,
        entriesCount: data.entriesCount,
        activitiesCount: data.activitiesWorked.size,
        foremenCount: data.foremenWorked.size,
        foremenNames: Array.from(data.foremenWorked),
      };
    });

    // Sort by PF descending
    breakdown.sort((a, b) => b.productionFactor - a.productionFactor);

    return breakdown;
  },
});

// Get PF breakdown by activity for a scope (for Control Center drill-down)
export const getActivityBreakdown = query({
  args: {
    scopeId: v.id("scopes"),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const scope = await ctx.db.get(args.scopeId);
    if (!scope) return [];

    const hasAccess = await checkProjectAccess(ctx, userId, scope.projectId);
    if (!hasAccess) return [];

    // Get all activities for this scope
    const activities = await ctx.db
      .query("activities")
      .withIndex("by_scope", (q) => q.eq("scopeId", args.scopeId))
      .collect();

    // Get all entries for this scope
    let entries = await ctx.db
      .query("dailyEntries")
      .withIndex("by_scope_and_date", (q) => q.eq("scopeId", args.scopeId))
      .collect();

    // Filter by date range if provided
    if (args.startDate && args.endDate) {
      entries = entries.filter(
        (e) => e.date >= args.startDate! && e.date <= args.endDate!
      );
    }

    // Group by activity
    const byActivity: Record<
      string,
      {
        totalActualQuantity: number;
        totalForecastQuantity: number;
        totalActualHours: number;
        totalForecastHours: number;
        entriesCount: number;
        foremenWorked: Set<string>;
      }
    > = {};

    for (const entry of entries) {
      const activityId = entry.activityId;
      if (!byActivity[activityId]) {
        byActivity[activityId] = {
          totalActualQuantity: 0,
          totalForecastQuantity: 0,
          totalActualHours: 0,
          totalForecastHours: 0,
          entriesCount: 0,
          foremenWorked: new Set(),
        };
      }
      byActivity[activityId].totalActualQuantity += entry.actualQuantity ?? 0;
      byActivity[activityId].totalForecastQuantity += entry.forecastQuantity ?? 0;
      byActivity[activityId].totalActualHours += entry.actualHours ?? 0;
      byActivity[activityId].totalForecastHours += entry.forecastHours ?? 0;
      byActivity[activityId].entriesCount += 1;
      if (entry.foremanName) {
        byActivity[activityId].foremenWorked.add(entry.foremanName);
      }
    }

    // Build breakdown
    const breakdown = activities.map((activity) => {
      const data = byActivity[activity._id] ?? {
        totalActualQuantity: 0,
        totalForecastQuantity: 0,
        totalActualHours: 0,
        totalForecastHours: 0,
        entriesCount: 0,
        foremenWorked: new Set(),
      };

      const productionFactor = data.totalForecastQuantity > 0
        ? data.totalActualQuantity / data.totalForecastQuantity
        : 0;

      const variancePercent = data.totalForecastQuantity > 0
        ? ((data.totalActualQuantity - data.totalForecastQuantity) / data.totalForecastQuantity) * 100
        : 0;

      return {
        activityId: activity._id,
        activityName: activity.name,
        unit: activity.unit,
        totalActualQuantity: data.totalActualQuantity,
        totalForecastQuantity: data.totalForecastQuantity,
        totalActualHours: data.totalActualHours,
        totalForecastHours: data.totalForecastHours,
        productionFactor: Math.round(productionFactor * 100) / 100,
        variancePercent: Math.round(variancePercent * 10) / 10,
        entriesCount: data.entriesCount,
        foremenNames: Array.from(data.foremenWorked),
      };
    });

    // Sort by PF descending
    breakdown.sort((a, b) => b.productionFactor - a.productionFactor);

    return breakdown;
  },
});
