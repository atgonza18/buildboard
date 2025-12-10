import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

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

// Get entry for a specific activity and date
export const getByActivityAndDate = query({
  args: {
    activityId: v.id("activities"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const activity = await ctx.db.get(args.activityId);
    if (!activity) return null;

    const hasAccess = await checkProjectAccess(ctx, userId, activity.projectId);
    if (!hasAccess) return null;

    return await ctx.db
      .query("dailyEntries")
      .withIndex("by_activity_and_date", (q) =>
        q.eq("activityId", args.activityId).eq("date", args.date)
      )
      .first();
  },
});

// List entries for a project on a specific date
export const listByProjectAndDate = query({
  args: {
    projectId: v.id("projects"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const hasAccess = await checkProjectAccess(ctx, userId, args.projectId);
    if (!hasAccess) return [];

    const entries = await ctx.db
      .query("dailyEntries")
      .withIndex("by_project_and_date", (q) =>
        q.eq("projectId", args.projectId).eq("date", args.date)
      )
      .collect();

    // Enrich with activity and scope info
    const enrichedEntries = await Promise.all(
      entries.map(async (entry) => {
        const activity = await ctx.db.get(entry.activityId);
        const scope = await ctx.db.get(entry.scopeId);
        const userProfile = await ctx.db
          .query("userProfiles")
          .withIndex("by_userId", (q) => q.eq("userId", entry.userId))
          .first();

        return {
          ...entry,
          activityName: activity?.name ?? "Unknown",
          activityUnit: activity?.unit ?? "units",
          scopeName: scope?.name ?? "Unknown",
          userName: userProfile?.name ?? "Unknown",
        };
      })
    );

    return enrichedEntries;
  },
});

// List entries for a date range (for charts/trends)
export const listByProjectAndDateRange = query({
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

    // Get all entries for this project and filter by date range
    const allEntries = await ctx.db
      .query("dailyEntries")
      .withIndex("by_project_and_date", (q) => q.eq("projectId", args.projectId))
      .collect();

    const filteredEntries = allEntries.filter(
      (e) => e.date >= args.startDate && e.date <= args.endDate
    );

    // Enrich with activity and scope info
    const enrichedEntries = await Promise.all(
      filteredEntries.map(async (entry) => {
        const activity = await ctx.db.get(entry.activityId);
        const scope = await ctx.db.get(entry.scopeId);

        return {
          ...entry,
          activityName: activity?.name ?? "Unknown",
          activityUnit: activity?.unit ?? "units",
          scopeName: scope?.name ?? "Unknown",
        };
      })
    );

    return enrichedEntries;
  },
});

// Helper to get user's name for leaderboard
async function getUserForemanName(ctx: any, userId: string): Promise<string | undefined> {
  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_userId", (q: any) => q.eq("userId", userId))
    .first();
  return profile?.name;
}

// Helper to get the assigned CM's name for a scope
async function getAssignedCMName(ctx: any, scopeId: string): Promise<string | undefined> {
  const assignment = await ctx.db
    .query("scopeAssignments")
    .withIndex("by_scopeId", (q: any) => q.eq("scopeId", scopeId))
    .first();

  if (!assignment) return undefined;

  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_userId", (q: any) => q.eq("userId", assignment.userId))
    .first();

  return profile?.name;
}

// Submit forecast (morning entry)
export const submitForecast = mutation({
  args: {
    activityId: v.id("activities"),
    date: v.string(),
    forecastQuantity: v.number(),
    forecastCrewSize: v.number(),
    forecastHoursPerWorker: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const activity = await ctx.db.get(args.activityId);
    if (!activity) throw new Error("Activity not found");

    const hasAccess = await checkProjectAccess(ctx, userId, activity.projectId);
    if (!hasAccess) throw new Error("Access denied");

    // Get the assigned CM's name for this scope, or fall back to current user's name
    const assignedCMName = await getAssignedCMName(ctx, activity.scopeId);
    const foremanName = assignedCMName ?? (await getUserForemanName(ctx, userId));

    // Calculate man-hours: crew size × hours per worker
    const forecastHours = args.forecastCrewSize * args.forecastHoursPerWorker;

    // Check if entry already exists
    const existing = await ctx.db
      .query("dailyEntries")
      .withIndex("by_activity_and_date", (q) =>
        q.eq("activityId", args.activityId).eq("date", args.date)
      )
      .first();

    if (existing) {
      // Update existing entry with forecast
      await ctx.db.patch(existing._id, {
        forecastQuantity: args.forecastQuantity,
        forecastCrewSize: args.forecastCrewSize,
        forecastHoursPerWorker: args.forecastHoursPerWorker,
        forecastHours,
        notes: args.notes ?? existing.notes,
        foremanName: foremanName ?? existing.foremanName,
        updatedBy: userId,
        updatedAt: Date.now(),
      });
      return existing._id;
    } else {
      // Create new entry
      return await ctx.db.insert("dailyEntries", {
        activityId: args.activityId,
        scopeId: activity.scopeId,
        projectId: activity.projectId,
        date: args.date,
        userId,
        foremanName,
        forecastQuantity: args.forecastQuantity,
        forecastCrewSize: args.forecastCrewSize,
        forecastHoursPerWorker: args.forecastHoursPerWorker,
        forecastHours,
        notes: args.notes,
        createdBy: userId,
        createdAt: Date.now(),
      });
    }
  },
});

// Submit actuals (end of day entry)
export const submitActuals = mutation({
  args: {
    activityId: v.id("activities"),
    date: v.string(),
    actualQuantity: v.number(),
    actualCrewSize: v.number(),
    actualHoursPerWorker: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const activity = await ctx.db.get(args.activityId);
    if (!activity) throw new Error("Activity not found");

    const hasAccess = await checkProjectAccess(ctx, userId, activity.projectId);
    if (!hasAccess) throw new Error("Access denied");

    // Get the assigned CM's name for this scope, or fall back to current user's name
    const assignedCMName = await getAssignedCMName(ctx, activity.scopeId);
    const foremanName = assignedCMName ?? (await getUserForemanName(ctx, userId));

    // Calculate man-hours: crew size × hours per worker
    const actualHours = args.actualCrewSize * args.actualHoursPerWorker;

    // Check if entry already exists
    const existing = await ctx.db
      .query("dailyEntries")
      .withIndex("by_activity_and_date", (q) =>
        q.eq("activityId", args.activityId).eq("date", args.date)
      )
      .first();

    if (existing) {
      // Update existing entry with actuals
      await ctx.db.patch(existing._id, {
        actualQuantity: args.actualQuantity,
        actualCrewSize: args.actualCrewSize,
        actualHoursPerWorker: args.actualHoursPerWorker,
        actualHours,
        notes: args.notes ?? existing.notes,
        foremanName: foremanName ?? existing.foremanName,
        updatedBy: userId,
        updatedAt: Date.now(),
      });
      return existing._id;
    } else {
      // Create new entry (no forecast entered)
      return await ctx.db.insert("dailyEntries", {
        activityId: args.activityId,
        scopeId: activity.scopeId,
        projectId: activity.projectId,
        date: args.date,
        userId,
        foremanName,
        actualQuantity: args.actualQuantity,
        actualCrewSize: args.actualCrewSize,
        actualHoursPerWorker: args.actualHoursPerWorker,
        actualHours,
        notes: args.notes,
        createdBy: userId,
        createdAt: Date.now(),
      });
    }
  },
});

// Submit both forecast and actuals at once
export const submitEntry = mutation({
  args: {
    activityId: v.id("activities"),
    date: v.string(),
    forecastQuantity: v.optional(v.number()),
    forecastCrewSize: v.optional(v.number()),
    forecastHoursPerWorker: v.optional(v.number()),
    actualQuantity: v.optional(v.number()),
    actualCrewSize: v.optional(v.number()),
    actualHoursPerWorker: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const activity = await ctx.db.get(args.activityId);
    if (!activity) throw new Error("Activity not found");

    const hasAccess = await checkProjectAccess(ctx, userId, activity.projectId);
    if (!hasAccess) throw new Error("Access denied");

    // Get the assigned CM's name for this scope, or fall back to current user's name
    const assignedCMName = await getAssignedCMName(ctx, activity.scopeId);
    const foremanName = assignedCMName ?? (await getUserForemanName(ctx, userId));

    // Calculate man-hours
    const forecastHours = (args.forecastCrewSize && args.forecastHoursPerWorker)
      ? args.forecastCrewSize * args.forecastHoursPerWorker
      : undefined;
    const actualHours = (args.actualCrewSize && args.actualHoursPerWorker)
      ? args.actualCrewSize * args.actualHoursPerWorker
      : undefined;

    // Check if entry already exists
    const existing = await ctx.db
      .query("dailyEntries")
      .withIndex("by_activity_and_date", (q) =>
        q.eq("activityId", args.activityId).eq("date", args.date)
      )
      .first();

    const data = {
      forecastQuantity: args.forecastQuantity,
      forecastCrewSize: args.forecastCrewSize,
      forecastHoursPerWorker: args.forecastHoursPerWorker,
      forecastHours,
      actualQuantity: args.actualQuantity,
      actualCrewSize: args.actualCrewSize,
      actualHoursPerWorker: args.actualHoursPerWorker,
      actualHours,
      notes: args.notes,
      foremanName,
    };

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...data,
        updatedBy: userId,
        updatedAt: Date.now(),
      });
      return existing._id;
    } else {
      return await ctx.db.insert("dailyEntries", {
        activityId: args.activityId,
        scopeId: activity.scopeId,
        projectId: activity.projectId,
        date: args.date,
        userId,
        ...data,
        createdBy: userId,
        createdAt: Date.now(),
      });
    }
  },
});

// Delete an entry
export const remove = mutation({
  args: { entryId: v.id("dailyEntries") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const entry = await ctx.db.get(args.entryId);
    if (!entry) throw new Error("Entry not found");

    const hasAccess = await checkProjectAccess(ctx, userId, entry.projectId);
    if (!hasAccess) throw new Error("Access denied");

    await ctx.db.delete(args.entryId);
  },
});
