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

// List scopes for a project
export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const hasAccess = await checkProjectAccess(ctx, userId, args.projectId);
    if (!hasAccess) return [];

    return await ctx.db
      .query("scopes")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

// Get a scope by ID
export const getById = query({
  args: { scopeId: v.id("scopes") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const scope = await ctx.db.get(args.scopeId);
    if (!scope) return null;

    const hasAccess = await checkProjectAccess(ctx, userId, scope.projectId);
    if (!hasAccess) return null;

    return scope;
  },
});

// Get scope with project info
export const getWithProject = query({
  args: { scopeId: v.id("scopes") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const scope = await ctx.db.get(args.scopeId);
    if (!scope) return null;

    const hasAccess = await checkProjectAccess(ctx, userId, scope.projectId);
    if (!hasAccess) return null;

    const project = await ctx.db.get(scope.projectId);

    return {
      ...scope,
      project,
    };
  },
});

// Create a new scope
export const create = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const hasAccess = await checkProjectAccess(ctx, userId, args.projectId);
    if (!hasAccess) throw new Error("Access denied");

    return await ctx.db.insert("scopes", {
      projectId: args.projectId,
      name: args.name,
      description: args.description,
      createdBy: userId,
      createdAt: Date.now(),
    });
  },
});

// Update a scope
export const update = mutation({
  args: {
    scopeId: v.id("scopes"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const scope = await ctx.db.get(args.scopeId);
    if (!scope) throw new Error("Scope not found");

    const hasAccess = await checkProjectAccess(ctx, userId, scope.projectId);
    if (!hasAccess) throw new Error("Access denied");

    const updates: any = {
      updatedBy: userId,
      updatedAt: Date.now(),
    };
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;

    await ctx.db.patch(args.scopeId, updates);
    return args.scopeId;
  },
});

// Delete a scope
export const remove = mutation({
  args: { scopeId: v.id("scopes") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const scope = await ctx.db.get(args.scopeId);
    if (!scope) throw new Error("Scope not found");

    const hasAccess = await checkProjectAccess(ctx, userId, scope.projectId);
    if (!hasAccess) throw new Error("Access denied");

    // Delete all activities in this scope
    const activities = await ctx.db
      .query("activities")
      .withIndex("by_scope", (q) => q.eq("scopeId", args.scopeId))
      .collect();

    for (const activity of activities) {
      // Delete all daily entries for this activity
      const entries = await ctx.db
        .query("dailyEntries")
        .withIndex("by_activity_and_date", (q) =>
          q.eq("activityId", activity._id)
        )
        .collect();

      for (const entry of entries) {
        await ctx.db.delete(entry._id);
      }

      await ctx.db.delete(activity._id);
    }

    await ctx.db.delete(args.scopeId);
  },
});
