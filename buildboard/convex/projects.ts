import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Helper to check if user can access a project
async function canAccessProject(
  ctx: any,
  userId: string,
  projectId?: string
): Promise<{ canAccess: boolean; isControlCenter: boolean }> {
  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_userId", (q: any) => q.eq("userId", userId))
    .first();

  // If no profile exists, treat as new user with limited access
  // They can see all projects but should set up their profile
  if (!profile) {
    // Allow access to view projects so they can navigate, but not as admin
    return { canAccess: true, isControlCenter: false };
  }

  // Control Center can access everything
  if (profile.role === "control_center") {
    return { canAccess: true, isControlCenter: true };
  }

  // Construction Manager needs assignment
  if (projectId) {
    const assignment = await ctx.db
      .query("projectAssignments")
      .withIndex("by_userId_and_projectId", (q: any) =>
        q.eq("userId", userId).eq("projectId", projectId)
      )
      .first();
    return { canAccess: !!assignment, isControlCenter: false };
  }

  return { canAccess: true, isControlCenter: false };
}

// List all projects (filtered by access)
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Check if user has a profile
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    // If no profile or user is Control Center, show all projects
    if (!profile || profile.role === "control_center") {
      return await ctx.db.query("projects").collect();
    }

    // Construction Manager sees only assigned projects
    const assignments = await ctx.db
      .query("projectAssignments")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const projects = await Promise.all(
      assignments.map((a) => ctx.db.get(a.projectId))
    );

    return projects.filter(Boolean);
  },
});

// Get a single project by ID
export const getById = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const { canAccess } = await canAccessProject(ctx, userId, args.projectId);
    if (!canAccess) return null;

    return await ctx.db.get(args.projectId);
  },
});

// Create a new project (Control Center only)
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("completed"),
      v.literal("on_hold")
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const { isControlCenter } = await canAccessProject(ctx, userId);
    if (!isControlCenter) {
      throw new Error("Only Control Center can create projects");
    }

    return await ctx.db.insert("projects", {
      name: args.name,
      description: args.description,
      status: args.status,
      createdBy: userId,
      createdAt: Date.now(),
    });
  },
});

// Update a project
export const update = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(
      v.union(v.literal("active"), v.literal("completed"), v.literal("on_hold"))
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const { canAccess, isControlCenter } = await canAccessProject(
      ctx,
      userId,
      args.projectId
    );
    if (!canAccess) throw new Error("Access denied");

    // Only Control Center can update project details
    if (!isControlCenter) {
      throw new Error("Only Control Center can update projects");
    }

    const updates: any = {
      updatedBy: userId,
      updatedAt: Date.now(),
    };
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.status !== undefined) updates.status = args.status;

    await ctx.db.patch(args.projectId, updates);
    return args.projectId;
  },
});

// Assign a Construction Manager to a project
export const assignUser = mutation({
  args: {
    projectId: v.id("projects"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) throw new Error("Not authenticated");

    const { isControlCenter } = await canAccessProject(ctx, currentUserId);
    if (!isControlCenter) {
      throw new Error("Only Control Center can assign users to projects");
    }

    // Check if assignment already exists
    const existing = await ctx.db
      .query("projectAssignments")
      .withIndex("by_userId_and_projectId", (q) =>
        q.eq("userId", args.userId).eq("projectId", args.projectId)
      )
      .first();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("projectAssignments", {
      userId: args.userId,
      projectId: args.projectId,
    });
  },
});

// Remove a user from a project
export const unassignUser = mutation({
  args: {
    projectId: v.id("projects"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) throw new Error("Not authenticated");

    const { isControlCenter } = await canAccessProject(ctx, currentUserId);
    if (!isControlCenter) {
      throw new Error("Only Control Center can unassign users from projects");
    }

    const assignment = await ctx.db
      .query("projectAssignments")
      .withIndex("by_userId_and_projectId", (q) =>
        q.eq("userId", args.userId).eq("projectId", args.projectId)
      )
      .first();

    if (assignment) {
      await ctx.db.delete(assignment._id);
    }
  },
});

// Toggle leaderboard mode for a project (Control Center only)
export const toggleLeaderboard = mutation({
  args: {
    projectId: v.id("projects"),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const { isControlCenter } = await canAccessProject(ctx, userId);
    if (!isControlCenter) {
      throw new Error("Only Control Center can change leaderboard settings");
    }

    await ctx.db.patch(args.projectId, {
      leaderboardEnabled: args.enabled,
      updatedBy: userId,
      updatedAt: Date.now(),
    });

    return args.projectId;
  },
});

// Get users assigned to a project
export const getAssignedUsers = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const { canAccess } = await canAccessProject(ctx, userId, args.projectId);
    if (!canAccess) return [];

    const assignments = await ctx.db
      .query("projectAssignments")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .collect();

    const users = await Promise.all(
      assignments.map(async (a) => {
        const profile = await ctx.db
          .query("userProfiles")
          .withIndex("by_userId", (q) => q.eq("userId", a.userId))
          .first();
        const user = await ctx.db.get(a.userId);
        return {
          assignmentId: a._id,
          userId: a.userId,
          name: profile?.name ?? "Unknown",
          email: user?.email ?? "Unknown",
          role: profile?.role ?? "construction_manager",
        };
      })
    );

    return users;
  },
});
