import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Check if user is Control Center
async function isControlCenter(ctx: any, userId: string): Promise<boolean> {
  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_userId", (q: any) => q.eq("userId", userId))
    .first();
  return profile?.role === "control_center";
}

// Get all CMs assigned to a scope
export const getByScopeId = query({
  args: { scopeId: v.id("scopes") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const assignments = await ctx.db
      .query("scopeAssignments")
      .withIndex("by_scopeId", (q) => q.eq("scopeId", args.scopeId))
      .collect();

    // Enrich with user profile info
    const enrichedAssignments = await Promise.all(
      assignments.map(async (assignment) => {
        const profile = await ctx.db
          .query("userProfiles")
          .withIndex("by_userId", (q) => q.eq("userId", assignment.userId))
          .first();
        const user = await ctx.db.get(assignment.userId);

        return {
          _id: assignment._id,
          userId: assignment.userId,
          scopeId: assignment.scopeId,
          name: profile?.name ?? "Unknown",
          email: user?.email ?? "Unknown",
          jobTitle: profile?.jobTitle,
        };
      })
    );

    return enrichedAssignments;
  },
});

// Get all scopes assigned to a user
export const getByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) return [];

    const assignments = await ctx.db
      .query("scopeAssignments")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    // Enrich with scope info
    const enrichedAssignments = await Promise.all(
      assignments.map(async (assignment) => {
        const scope = await ctx.db.get(assignment.scopeId);
        const project = await ctx.db.get(assignment.projectId);

        return {
          _id: assignment._id,
          scopeId: assignment.scopeId,
          scopeName: scope?.name ?? "Unknown",
          projectId: assignment.projectId,
          projectName: project?.name ?? "Unknown",
        };
      })
    );

    return enrichedAssignments;
  },
});

// Get the assigned CM for a scope (returns first assignment if multiple)
export const getAssignedCM = query({
  args: { scopeId: v.id("scopes") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const assignment = await ctx.db
      .query("scopeAssignments")
      .withIndex("by_scopeId", (q) => q.eq("scopeId", args.scopeId))
      .first();

    if (!assignment) return null;

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", assignment.userId))
      .first();

    return {
      userId: assignment.userId,
      name: profile?.name ?? "Unknown",
      jobTitle: profile?.jobTitle,
    };
  },
});

// Get all scope assignments for a project with user details
export const getByProjectId = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const assignments = await ctx.db
      .query("scopeAssignments")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .collect();

    // Enrich with user and scope info
    const enrichedAssignments = await Promise.all(
      assignments.map(async (assignment) => {
        const profile = await ctx.db
          .query("userProfiles")
          .withIndex("by_userId", (q) => q.eq("userId", assignment.userId))
          .first();
        const scope = await ctx.db.get(assignment.scopeId);

        return {
          _id: assignment._id,
          userId: assignment.userId,
          userName: profile?.name ?? "Unknown",
          jobTitle: profile?.jobTitle,
          scopeId: assignment.scopeId,
          scopeName: scope?.name ?? "Unknown",
        };
      })
    );

    return enrichedAssignments;
  },
});

// Assign a CM to a scope (Control Center only)
export const assign = mutation({
  args: {
    userId: v.id("users"),
    scopeId: v.id("scopes"),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) throw new Error("Not authenticated");

    const isCC = await isControlCenter(ctx, currentUserId);
    if (!isCC) throw new Error("Only Control Center can assign users to scopes");

    // Get the scope to find the project
    const scope = await ctx.db.get(args.scopeId);
    if (!scope) throw new Error("Scope not found");

    // Check if assignment already exists
    const existing = await ctx.db
      .query("scopeAssignments")
      .withIndex("by_userId_and_scopeId", (q) =>
        q.eq("userId", args.userId).eq("scopeId", args.scopeId)
      )
      .first();

    if (existing) {
      return existing._id;
    }

    // Also ensure user is assigned to the project
    const projectAssignment = await ctx.db
      .query("projectAssignments")
      .withIndex("by_userId_and_projectId", (q) =>
        q.eq("userId", args.userId).eq("projectId", scope.projectId)
      )
      .first();

    if (!projectAssignment) {
      // Auto-assign to project as well
      await ctx.db.insert("projectAssignments", {
        userId: args.userId,
        projectId: scope.projectId,
      });
    }

    return await ctx.db.insert("scopeAssignments", {
      userId: args.userId,
      scopeId: args.scopeId,
      projectId: scope.projectId,
    });
  },
});

// Remove a CM from a scope (Control Center only)
export const unassign = mutation({
  args: {
    userId: v.id("users"),
    scopeId: v.id("scopes"),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) throw new Error("Not authenticated");

    const isCC = await isControlCenter(ctx, currentUserId);
    if (!isCC) throw new Error("Only Control Center can unassign users from scopes");

    const assignment = await ctx.db
      .query("scopeAssignments")
      .withIndex("by_userId_and_scopeId", (q) =>
        q.eq("userId", args.userId).eq("scopeId", args.scopeId)
      )
      .first();

    if (assignment) {
      await ctx.db.delete(assignment._id);
    }
  },
});

// Get all CMs available for assignment (construction_manager role)
export const getAvailableCMs = query({
  args: { projectId: v.optional(v.id("projects")) },
  handler: async (ctx, _args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Get all construction managers
    const cmProfiles = await ctx.db
      .query("userProfiles")
      .withIndex("by_role", (q) => q.eq("role", "construction_manager"))
      .collect();

    const cms = await Promise.all(
      cmProfiles.map(async (profile) => {
        const user = await ctx.db.get(profile.userId);
        return {
          userId: profile.userId,
          name: profile.name,
          email: user?.email ?? "Unknown",
          jobTitle: profile.jobTitle,
        };
      })
    );

    return cms;
  },
});
