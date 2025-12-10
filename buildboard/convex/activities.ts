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

// List activities for a scope
export const listByScope = query({
  args: { scopeId: v.id("scopes") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const scope = await ctx.db.get(args.scopeId);
    if (!scope) return [];

    const hasAccess = await checkProjectAccess(ctx, userId, scope.projectId);
    if (!hasAccess) return [];

    return await ctx.db
      .query("activities")
      .withIndex("by_scope", (q) => q.eq("scopeId", args.scopeId))
      .collect();
  },
});

// List all activities for a project
export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const hasAccess = await checkProjectAccess(ctx, userId, args.projectId);
    if (!hasAccess) return [];

    const activities = await ctx.db
      .query("activities")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    // Include scope info
    const activitiesWithScope = await Promise.all(
      activities.map(async (activity) => {
        const scope = await ctx.db.get(activity.scopeId);
        return {
          ...activity,
          scopeName: scope?.name ?? "Unknown",
        };
      })
    );

    return activitiesWithScope;
  },
});

// Get an activity by ID
export const getById = query({
  args: { activityId: v.id("activities") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const activity = await ctx.db.get(args.activityId);
    if (!activity) return null;

    const hasAccess = await checkProjectAccess(ctx, userId, activity.projectId);
    if (!hasAccess) return null;

    const scope = await ctx.db.get(activity.scopeId);

    return {
      ...activity,
      scopeName: scope?.name ?? "Unknown",
    };
  },
});

// Create a new activity
export const create = mutation({
  args: {
    scopeId: v.id("scopes"),
    name: v.string(),
    unit: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const scope = await ctx.db.get(args.scopeId);
    if (!scope) throw new Error("Scope not found");

    const hasAccess = await checkProjectAccess(ctx, userId, scope.projectId);
    if (!hasAccess) throw new Error("Access denied");

    return await ctx.db.insert("activities", {
      scopeId: args.scopeId,
      projectId: scope.projectId,
      name: args.name,
      unit: args.unit,
      description: args.description,
      createdBy: userId,
      createdAt: Date.now(),
    });
  },
});

// Update an activity
export const update = mutation({
  args: {
    activityId: v.id("activities"),
    name: v.optional(v.string()),
    unit: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const activity = await ctx.db.get(args.activityId);
    if (!activity) throw new Error("Activity not found");

    const hasAccess = await checkProjectAccess(ctx, userId, activity.projectId);
    if (!hasAccess) throw new Error("Access denied");

    const updates: any = {
      updatedBy: userId,
      updatedAt: Date.now(),
    };
    if (args.name !== undefined) updates.name = args.name;
    if (args.unit !== undefined) updates.unit = args.unit;
    if (args.description !== undefined) updates.description = args.description;

    await ctx.db.patch(args.activityId, updates);
    return args.activityId;
  },
});

// Delete an activity
export const remove = mutation({
  args: { activityId: v.id("activities") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const activity = await ctx.db.get(args.activityId);
    if (!activity) throw new Error("Activity not found");

    const hasAccess = await checkProjectAccess(ctx, userId, activity.projectId);
    if (!hasAccess) throw new Error("Access denied");

    // Delete all daily entries for this activity
    const entries = await ctx.db
      .query("dailyEntries")
      .withIndex("by_activity_and_date", (q) => q.eq("activityId", args.activityId))
      .collect();

    for (const entry of entries) {
      await ctx.db.delete(entry._id);
    }

    await ctx.db.delete(args.activityId);
  },
});
