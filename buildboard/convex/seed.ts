import { mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Demo foremen/construction managers with their performance characteristics
const DEMO_FOREMEN = [
  { name: "Mike Rodriguez", performanceMultiplier: 1.15 }, // Top performer
  { name: "Sarah Chen", performanceMultiplier: 1.08 },
  { name: "James Wilson", performanceMultiplier: 1.02 },
  { name: "Maria Garcia", performanceMultiplier: 0.95 },
  { name: "David Thompson", performanceMultiplier: 0.88 },
];

// Seed demo data (call this after signing up)
export const seedDemoData = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if user already has a profile
    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!existingProfile) {
      // Create Control Center profile for the first user
      await ctx.db.insert("userProfiles", {
        userId,
        name: "Admin User",
        role: "control_center",
      });
    }

    // Check if demo project already exists
    const existingProjects = await ctx.db.query("projects").collect();
    if (existingProjects.length > 0) {
      return { message: "Demo data already exists", projectId: existingProjects[0]._id };
    }

    const now = Date.now();

    // Create demo project
    const projectId = await ctx.db.insert("projects", {
      name: "Solar Farm Alpha",
      description: "500MW Solar Installation Project",
      status: "active",
      createdBy: userId,
      createdAt: now,
    });

    // Create scopes
    const electricalScopeId = await ctx.db.insert("scopes", {
      projectId,
      name: "Electrical",
      description: "All electrical installation work",
      createdBy: userId,
      createdAt: now,
    });

    const mechanicalScopeId = await ctx.db.insert("scopes", {
      projectId,
      name: "Mechanical",
      description: "Mechanical systems and equipment",
      createdBy: userId,
      createdAt: now,
    });

    const civilScopeId = await ctx.db.insert("scopes", {
      projectId,
      name: "Civil",
      description: "Civil works and site preparation",
      createdBy: userId,
      createdAt: now,
    });

    // Create activities for Electrical scope
    const undergroundElectricalId = await ctx.db.insert("activities", {
      scopeId: electricalScopeId,
      projectId,
      name: "Underground Electrical",
      unit: "linear feet",
      description: "Underground cable installation",
      createdBy: userId,
      createdAt: now,
    });

    const dcCableTrenchingId = await ctx.db.insert("activities", {
      scopeId: electricalScopeId,
      projectId,
      name: "DC Cable Trenching",
      unit: "linear feet",
      description: "Trenching for DC cables",
      createdBy: userId,
      createdAt: now,
    });

    const panelWiringId = await ctx.db.insert("activities", {
      scopeId: electricalScopeId,
      projectId,
      name: "Panel Wiring",
      unit: "panels",
      description: "Wiring solar panels",
      createdBy: userId,
      createdAt: now,
    });

    // Create activities for Mechanical scope
    const trackerInstallId = await ctx.db.insert("activities", {
      scopeId: mechanicalScopeId,
      projectId,
      name: "Tracker Installation",
      unit: "units",
      description: "Solar tracker installation",
      createdBy: userId,
      createdAt: now,
    });

    const panelMountingId = await ctx.db.insert("activities", {
      scopeId: mechanicalScopeId,
      projectId,
      name: "Panel Mounting",
      unit: "panels",
      description: "Mounting panels on trackers",
      createdBy: userId,
      createdAt: now,
    });

    // Create activities for Civil scope
    const gradingId = await ctx.db.insert("activities", {
      scopeId: civilScopeId,
      projectId,
      name: "Site Grading",
      unit: "acres",
      description: "Land grading and preparation",
      createdBy: userId,
      createdAt: now,
    });

    const roadConstructionId = await ctx.db.insert("activities", {
      scopeId: civilScopeId,
      projectId,
      name: "Road Construction",
      unit: "linear feet",
      description: "Access road construction",
      createdBy: userId,
      createdAt: now,
    });

    // Assign activities to different foremen
    // Each foreman leads specific activities with crew sizes
    const activityAssignments = [
      { activity: undergroundElectricalId, scopeId: electricalScopeId, foremanIndex: 0, baseQuantity: 500, baseCrewSize: 8, baseHoursPerWorker: 8 },
      { activity: dcCableTrenchingId, scopeId: electricalScopeId, foremanIndex: 1, baseQuantity: 300, baseCrewSize: 6, baseHoursPerWorker: 8 },
      { activity: panelWiringId, scopeId: electricalScopeId, foremanIndex: 2, baseQuantity: 50, baseCrewSize: 4, baseHoursPerWorker: 8 },
      { activity: trackerInstallId, scopeId: mechanicalScopeId, foremanIndex: 3, baseQuantity: 10, baseCrewSize: 6, baseHoursPerWorker: 8 },
      { activity: panelMountingId, scopeId: mechanicalScopeId, foremanIndex: 4, baseQuantity: 40, baseCrewSize: 5, baseHoursPerWorker: 8 },
      { activity: gradingId, scopeId: civilScopeId, foremanIndex: 0, baseQuantity: 5, baseCrewSize: 3, baseHoursPerWorker: 10 },
      { activity: roadConstructionId, scopeId: civilScopeId, foremanIndex: 1, baseQuantity: 200, baseCrewSize: 8, baseHoursPerWorker: 8 },
    ];

    // Create entries for the past 14 days to show meaningful leaderboard data
    const today = new Date();

    for (let dayOffset = 13; dayOffset >= 0; dayOffset--) {
      const date = new Date(today);
      date.setDate(date.getDate() - dayOffset);
      const dateStr = date.toISOString().split("T")[0];

      // Skip weekends for realism
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      for (const assignment of activityAssignments) {
        const foreman = DEMO_FOREMEN[assignment.foremanIndex];

        // Add some daily variance
        const dailyVariance = 0.85 + Math.random() * 0.3; // 85% to 115%
        const performanceVariance = foreman.performanceMultiplier * (0.9 + Math.random() * 0.2);

        const forecastQuantity = Math.round(assignment.baseQuantity * dailyVariance);
        const forecastCrewSize = assignment.baseCrewSize;
        const forecastHoursPerWorker = Math.round(assignment.baseHoursPerWorker * dailyVariance * 10) / 10;
        const forecastHours = forecastCrewSize * forecastHoursPerWorker; // Man-hours

        // Actuals reflect the foreman's performance multiplier
        const actualQuantity = Math.round(forecastQuantity * performanceVariance);
        // Crew size might vary slightly
        const actualCrewSize = Math.max(1, forecastCrewSize + Math.floor(Math.random() * 3) - 1);
        const actualHoursPerWorker = Math.round(forecastHoursPerWorker * (1 / performanceVariance) * 10) / 10;
        const actualHours = actualCrewSize * actualHoursPerWorker; // Man-hours

        await ctx.db.insert("dailyEntries", {
          activityId: assignment.activity,
          scopeId: assignment.scopeId,
          projectId,
          date: dateStr,
          userId,
          foremanName: foreman.name, // Track foreman name for leaderboard
          forecastQuantity,
          forecastCrewSize,
          forecastHoursPerWorker,
          forecastHours,
          actualQuantity,
          actualCrewSize,
          actualHoursPerWorker,
          actualHours,
          createdBy: userId,
          createdAt: date.getTime(), // Use the entry date for realistic timestamps
        });
      }
    }

    return { message: "Demo data with leaderboard created successfully", projectId };
  },
});

// Clear sample data (keeps users and projects)
export const clearSampleData = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if user is Control Center
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!profile || profile.role !== "control_center") {
      throw new Error("Only Control Center can clear data");
    }

    // Delete all daily entries
    const entries = await ctx.db.query("dailyEntries").collect();
    for (const entry of entries) {
      await ctx.db.delete(entry._id);
    }

    // Delete all activities
    const activities = await ctx.db.query("activities").collect();
    for (const activity of activities) {
      await ctx.db.delete(activity._id);
    }

    // Delete all scopes
    const scopes = await ctx.db.query("scopes").collect();
    for (const scope of scopes) {
      await ctx.db.delete(scope._id);
    }

    return {
      message: "Sample data cleared (users and projects preserved)",
      deletedEntries: entries.length,
      deletedActivities: activities.length,
      deletedScopes: scopes.length,
    };
  },
});

// Clear all demo data (including projects)
export const clearDemoData = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if user is Control Center
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!profile || profile.role !== "control_center") {
      throw new Error("Only Control Center can clear data");
    }

    // Delete all entries
    const entries = await ctx.db.query("dailyEntries").collect();
    for (const entry of entries) {
      await ctx.db.delete(entry._id);
    }

    // Delete all activities
    const activities = await ctx.db.query("activities").collect();
    for (const activity of activities) {
      await ctx.db.delete(activity._id);
    }

    // Delete all scopes
    const scopes = await ctx.db.query("scopes").collect();
    for (const scope of scopes) {
      await ctx.db.delete(scope._id);
    }

    // Delete all project assignments
    const assignments = await ctx.db.query("projectAssignments").collect();
    for (const assignment of assignments) {
      await ctx.db.delete(assignment._id);
    }

    // Delete all projects
    const projects = await ctx.db.query("projects").collect();
    for (const project of projects) {
      await ctx.db.delete(project._id);
    }

    return { message: "All demo data cleared" };
  },
});
