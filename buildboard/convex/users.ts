import { v } from "convex/values";
import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId, createAccount, modifyAccountCredentials } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

// Job title validator
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

// Internal mutation to check if user is Control Center
export const checkIsControlCenter = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
    return profile?.role === "control_center";
  },
});

// Internal mutation to create user profile after account creation
export const createUserProfile = internalMutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    role: v.union(v.literal("control_center"), v.literal("construction_manager")),
    jobTitle: v.optional(jobTitleValidator),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("userProfiles", {
      userId: args.userId,
      name: args.name,
      role: args.role,
      jobTitle: args.jobTitle,
    });
  },
});

// Internal mutation to check if email exists
export const checkEmailExists = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    // Check in authAccounts table for existing email
    const existingAccount = await ctx.db
      .query("authAccounts")
      .filter((q) => q.eq(q.field("providerAccountId"), args.email.toLowerCase()))
      .first();
    return !!existingAccount;
  },
});

// Action for Control Center to create a new user account
export const createUserAccount = action({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.string(),
    role: v.union(v.literal("control_center"), v.literal("construction_manager")),
    jobTitle: v.optional(jobTitleValidator),
    projectIds: v.optional(v.array(v.id("projects"))),
  },
  handler: async (ctx, args) => {
    // Check if caller is authenticated and is Control Center
    const callerId = await getAuthUserId(ctx);
    if (!callerId) {
      throw new Error("Not authenticated");
    }

    const isCC = await ctx.runMutation(internal.users.checkIsControlCenter, {
      userId: callerId,
    });
    if (!isCC) {
      throw new Error("Only Control Center users can create accounts");
    }

    // Check if email already exists
    const emailExists = await ctx.runMutation(internal.users.checkEmailExists, {
      email: args.email,
    });
    if (emailExists) {
      throw new Error("An account with this email already exists");
    }

    // Create the account using Convex Auth
    const { user } = await createAccount(ctx, {
      provider: "password",
      account: {
        id: args.email.toLowerCase(),
        secret: args.password,
      },
      profile: {
        email: args.email.toLowerCase(),
      },
      shouldLinkViaEmail: false,
      shouldLinkViaPhone: false,
    });

    // Create the user profile
    await ctx.runMutation(internal.users.createUserProfile, {
      userId: user._id as Id<"users">,
      name: args.name,
      role: args.role,
      jobTitle: args.jobTitle,
    });

    // Assign to projects if provided
    if (args.projectIds && args.projectIds.length > 0) {
      await ctx.runMutation(internal.users.assignUserToProjects, {
        userId: user._id as Id<"users">,
        projectIds: args.projectIds,
      });
    }

    return { success: true, userId: user._id };
  },
});

// Action for users to change their own password
export const changePassword = action({
  args: {
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get the user's email from their account
    const account = await ctx.runMutation(internal.users.getUserAccount, {
      userId,
    });
    if (!account) {
      throw new Error("Account not found");
    }

    // Verify current password by trying to retrieve the account
    try {
      const { retrieveAccount } = await import("@convex-dev/auth/server");
      await retrieveAccount(ctx, {
        provider: "password",
        account: {
          id: account.providerAccountId,
          secret: args.currentPassword,
        },
      });
    } catch {
      throw new Error("Current password is incorrect");
    }

    // Update to new password
    await modifyAccountCredentials(ctx, {
      provider: "password",
      account: {
        id: account.providerAccountId,
        secret: args.newPassword,
      },
    });

    return { success: true };
  },
});

// Internal mutation to get user's auth account
export const getUserAccount = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("authAccounts")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();
    return account;
  },
});

// Internal mutation to assign user to multiple projects
export const assignUserToProjects = internalMutation({
  args: {
    userId: v.id("users"),
    projectIds: v.array(v.id("projects")),
  },
  handler: async (ctx, args) => {
    for (const projectId of args.projectIds) {
      // Check if assignment already exists
      const existing = await ctx.db
        .query("projectAssignments")
        .withIndex("by_userId_and_projectId", (q) =>
          q.eq("userId", args.userId).eq("projectId", projectId)
        )
        .first();

      if (!existing) {
        await ctx.db.insert("projectAssignments", {
          userId: args.userId,
          projectId: projectId,
        });
      }
    }
  },
});
