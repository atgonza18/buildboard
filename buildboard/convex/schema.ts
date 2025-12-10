import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// Schema with optional audit fields for backwards compatibility

export default defineSchema({
  ...authTables,

  // User profiles with role information
  userProfiles: defineTable({
    userId: v.id("users"),
    name: v.string(),
    role: v.union(v.literal("control_center"), v.literal("construction_manager")),
    // Job title for field personnel (used for leaderboard identification)
    jobTitle: v.optional(
      v.union(
        v.literal("foreman"),
        v.literal("construction_manager"),
        v.literal("project_manager"),
        v.literal("assistant_project_manager"),
        v.literal("superintendent"),
        v.literal("project_controls"),
        v.literal("field_engineer"),
        v.literal("field_quality_manager")
      )
    ),
  })
    .index("by_userId", ["userId"])
    .index("by_role", ["role"]),

  // Links Construction Managers to their assigned projects
  projectAssignments: defineTable({
    userId: v.id("users"),
    projectId: v.id("projects"),
  })
    .index("by_userId", ["userId"])
    .index("by_projectId", ["projectId"])
    .index("by_userId_and_projectId", ["userId", "projectId"]),

  // Links Construction Managers to their assigned scopes
  scopeAssignments: defineTable({
    userId: v.id("users"),
    scopeId: v.id("scopes"),
    projectId: v.id("projects"), // Denormalized for easier queries
  })
    .index("by_userId", ["userId"])
    .index("by_scopeId", ["scopeId"])
    .index("by_projectId", ["projectId"])
    .index("by_userId_and_scopeId", ["userId", "scopeId"]),

  // Construction projects
  projects: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("completed"),
      v.literal("on_hold")
    ),
    // Leaderboard mode: true = competitive (individual rankings), false = team mode (aggregate only)
    // Defaults to true if not set
    leaderboardEnabled: v.optional(v.boolean()),
    // Audit fields (optional to support existing data)
    createdBy: v.optional(v.id("users")),
    createdAt: v.optional(v.number()), // Unix timestamp in ms
    updatedBy: v.optional(v.id("users")),
    updatedAt: v.optional(v.number()),
  }).index("by_status", ["status"]),

  // Scopes within a project (Mechanical, Electrical, Civil)
  scopes: defineTable({
    projectId: v.id("projects"),
    name: v.string(),
    description: v.optional(v.string()),
    // Audit fields (optional to support existing data)
    createdBy: v.optional(v.id("users")),
    createdAt: v.optional(v.number()),
    updatedBy: v.optional(v.id("users")),
    updatedAt: v.optional(v.number()),
  }).index("by_project", ["projectId"]),

  // Activities within a scope
  activities: defineTable({
    scopeId: v.id("scopes"),
    projectId: v.id("projects"),
    name: v.string(),
    unit: v.string(), // e.g., "linear feet", "units", "cubic yards"
    description: v.optional(v.string()),
    // Audit fields (optional to support existing data)
    createdBy: v.optional(v.id("users")),
    createdAt: v.optional(v.number()),
    updatedBy: v.optional(v.id("users")),
    updatedAt: v.optional(v.number()),
  })
    .index("by_scope", ["scopeId"])
    .index("by_project", ["projectId"]),

  // Daily entries tracking forecast and actuals
  dailyEntries: defineTable({
    activityId: v.id("activities"),
    scopeId: v.id("scopes"),
    projectId: v.id("projects"),
    date: v.string(), // ISO date "YYYY-MM-DD"
    userId: v.id("users"),

    // Foreman/Construction Manager who logged this entry (for leaderboard)
    foremanName: v.optional(v.string()),

    // Forecast (morning entry)
    forecastQuantity: v.optional(v.number()),
    forecastCrewSize: v.optional(v.number()), // Number of workers
    forecastHoursPerWorker: v.optional(v.number()), // Hours per worker
    forecastHours: v.optional(v.number()), // Total man-hours (crew × hours)

    // Actuals (end of day entry)
    actualQuantity: v.optional(v.number()),
    actualCrewSize: v.optional(v.number()), // Number of workers
    actualHoursPerWorker: v.optional(v.number()), // Hours per worker
    actualHours: v.optional(v.number()), // Total man-hours (crew × hours)

    notes: v.optional(v.string()),

    // Audit fields (optional to support existing data)
    createdBy: v.optional(v.id("users")),
    createdAt: v.optional(v.number()),
    updatedBy: v.optional(v.id("users")),
    updatedAt: v.optional(v.number()),
  })
    .index("by_activity_and_date", ["activityId", "date"])
    .index("by_project_and_date", ["projectId", "date"])
    .index("by_scope_and_date", ["scopeId", "date"])
    .index("by_user_and_date", ["userId", "date"])
    .index("by_date", ["date"])
    .index("by_foreman_and_project", ["foremanName", "projectId"]),
});
