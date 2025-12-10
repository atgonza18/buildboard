import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Job title options
const jobTitleValidator = v.union(
  v.literal("foreman"),
  v.literal("construction_manager"),
  v.literal("project_manager"),
  v.literal("assistant_project_manager"),
  v.literal("superintendent"),
  v.literal("project_controls"),
  v.literal("field_engineer"),
  v.literal("field_quality_manager")
);

// Get current user's profile
export const getCurrentProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    return profile;
  },
});

// Get a user profile by userId
export const getByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
  },
});

// Create or update user profile
export const upsertProfile = mutation({
  args: {
    name: v.string(),
    role: v.union(v.literal("control_center"), v.literal("construction_manager")),
    jobTitle: v.optional(jobTitleValidator),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        role: args.role,
        jobTitle: args.jobTitle,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("userProfiles", {
        userId,
        name: args.name,
        role: args.role,
        jobTitle: args.jobTitle,
      });
    }
  },
});

// List all users (for Control Center to assign CMs to projects)
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Check if user is Control Center
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!profile || profile.role !== "control_center") {
      return [];
    }

    const profiles = await ctx.db.query("userProfiles").collect();

    // Get user emails and project assignments
    const usersWithDetails = await Promise.all(
      profiles.map(async (p) => {
        const user = await ctx.db.get(p.userId);

        // Get project assignments
        const assignments = await ctx.db
          .query("projectAssignments")
          .withIndex("by_userId", (q) => q.eq("userId", p.userId))
          .collect();

        const projects = await Promise.all(
          assignments.map(async (a) => {
            const project = await ctx.db.get(a.projectId);
            return project ? { _id: project._id, name: project.name } : null;
          })
        );

        return {
          ...p,
          email: user?.email ?? "Unknown",
          assignedProjects: projects.filter((p) => p !== null),
        };
      })
    );

    return usersWithDetails;
  },
});

// Helper to check if current user is Control Center
async function isControlCenter(ctx: any, userId: string) {
  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_userId", (q: any) => q.eq("userId", userId))
    .first();
  return profile?.role === "control_center";
}

// Update another user's profile (Control Center only)
export const updateUserProfile = mutation({
  args: {
    profileId: v.id("userProfiles"),
    name: v.optional(v.string()),
    role: v.optional(v.union(v.literal("control_center"), v.literal("construction_manager"))),
    jobTitle: v.optional(jobTitleValidator),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    if (!(await isControlCenter(ctx, userId))) {
      throw new Error("Only Control Center users can manage other users");
    }

    const updates: any = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.role !== undefined) updates.role = args.role;
    if (args.jobTitle !== undefined) updates.jobTitle = args.jobTitle;

    await ctx.db.patch(args.profileId, updates);
    return args.profileId;
  },
});

// Delete a user profile (Control Center only)
export const deleteUserProfile = mutation({
  args: { profileId: v.id("userProfiles") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    if (!(await isControlCenter(ctx, userId))) {
      throw new Error("Only Control Center users can delete users");
    }

    const profile = await ctx.db.get(args.profileId);
    if (!profile) throw new Error("Profile not found");

    // Don't allow deleting yourself
    if (profile.userId === userId) {
      throw new Error("Cannot delete your own profile");
    }

    // Delete project assignments for this user
    const assignments = await ctx.db
      .query("projectAssignments")
      .withIndex("by_userId", (q) => q.eq("userId", profile.userId))
      .collect();

    for (const assignment of assignments) {
      await ctx.db.delete(assignment._id);
    }

    await ctx.db.delete(args.profileId);
  },
});

// List field users (construction_manager role) for leaderboard/entry selection
export const listFieldUsers = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const profiles = await ctx.db
      .query("userProfiles")
      .withIndex("by_role", (q) => q.eq("role", "construction_manager"))
      .collect();

    return profiles.map((p) => ({
      _id: p._id,
      userId: p.userId,
      name: p.name,
      jobTitle: p.jobTitle,
    }));
  },
});

// Get projects assigned to a user
export const getUserProjects = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) return [];

    // Check if current user is Control Center
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", currentUserId))
      .first();

    if (!profile || profile.role !== "control_center") {
      return [];
    }

    const assignments = await ctx.db
      .query("projectAssignments")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    const projects = await Promise.all(
      assignments.map(async (a) => {
        const project = await ctx.db.get(a.projectId);
        return project;
      })
    );

    return projects.filter((p) => p !== null);
  },
});
