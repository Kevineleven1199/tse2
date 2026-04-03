/**
 * Comprehensive Achievement Definitions for TriState Gamification System
 * Organized by role and category
 */

export interface AchievementDefinition {
  key: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  roleFilter: "HQ" | "MANAGER" | "CLEANER" | "CUSTOMER" | "ALL";
  category: "milestone" | "performance" | "engagement" | "streak" | "general";
  tier?: "bronze" | "silver" | "gold" | "platinum";
}

// ────────────────────────────────────────────────────────────
// CUSTOMER ACHIEVEMENTS (14 achievements)
// ────────────────────────────────────────────────────────────

export const CUSTOMER_ACHIEVEMENTS: AchievementDefinition[] = [
  // Booking Milestones
  {
    key: "first_booking",
    title: "Welcome to Green",
    description: "Book your first cleaning service",
    icon: "🌍",
    xpReward: 50,
    roleFilter: "CUSTOMER",
    category: "milestone",
    tier: "bronze",
  },
  {
    key: "regular_booker",
    title: "Regular",
    description: "Complete 5 bookings",
    icon: "📅",
    xpReward: 100,
    roleFilter: "CUSTOMER",
    category: "milestone",
    tier: "silver",
  },
  {
    key: "loyal_customer",
    title: "Loyal Customer",
    description: "Complete 10 bookings",
    icon: "💚",
    xpReward: 200,
    roleFilter: "CUSTOMER",
    category: "milestone",
    tier: "gold",
  },
  {
    key: "green_champion",
    title: "Green Champion",
    description: "Complete 25 bookings",
    icon: "🏆",
    xpReward: 500,
    roleFilter: "CUSTOMER",
    category: "milestone",
    tier: "platinum",
  },

  // Referral Program
  {
    key: "referral_starter",
    title: "Referral Starter",
    description: "Refer 1 friend who books",
    icon: "🤝",
    xpReward: 100,
    roleFilter: "CUSTOMER",
    category: "engagement",
    tier: "bronze",
  },
  {
    key: "referral_pro",
    title: "Referral Pro",
    description: "Refer 5 friends who book",
    icon: "🎊",
    xpReward: 300,
    roleFilter: "CUSTOMER",
    category: "engagement",
    tier: "silver",
  },
  {
    key: "referral_champion",
    title: "Referral Champion",
    description: "Refer 10 friends who book",
    icon: "👑",
    xpReward: 750,
    roleFilter: "CUSTOMER",
    category: "engagement",
    tier: "gold",
  },

  // Reviews & Feedback
  {
    key: "review_writer",
    title: "Review Writer",
    description: "Leave your first review",
    icon: "✍️",
    xpReward: 75,
    roleFilter: "CUSTOMER",
    category: "engagement",
    tier: "bronze",
  },
  {
    key: "five_star_reviewer",
    title: "Five Star Reviewer",
    description: "Leave a 5-star review",
    icon: "⭐",
    xpReward: 100,
    roleFilter: "CUSTOMER",
    category: "performance",
    tier: "bronze",
  },

  // Eco-Consciousness
  {
    key: "eco_warrior",
    title: "Eco Warrior",
    description: "Choose all-organic add-ons in a single booking",
    icon: "🌿",
    xpReward: 75,
    roleFilter: "CUSTOMER",
    category: "engagement",
    tier: "bronze",
  },
  {
    key: "green_selector",
    title: "Green Selector",
    description: "Choose professional options in 3 bookings",
    icon: "♻️",
    xpReward: 150,
    roleFilter: "CUSTOMER",
    category: "engagement",
    tier: "silver",
  },

  // Booking Habits
  {
    key: "early_bird_booker",
    title: "Early Bird Booker",
    description: "Book 7+ days in advance",
    icon: "🌅",
    xpReward: 50,
    roleFilter: "CUSTOMER",
    category: "performance",
    tier: "bronze",
  },

  // Streak Achievements
  {
    key: "streak_3_months",
    title: "Consistent Care",
    description: "Book services for 3 consecutive months",
    icon: "🔥",
    xpReward: 150,
    roleFilter: "CUSTOMER",
    category: "streak",
    tier: "silver",
  },
  {
    key: "streak_6_months",
    title: "Dedicated Green Fan",
    description: "Book services for 6 consecutive months",
    icon: "💪",
    xpReward: 300,
    roleFilter: "CUSTOMER",
    category: "streak",
    tier: "gold",
  },
  {
    key: "streak_12_months",
    title: "Year-Round Guardian",
    description: "Book services for 12 consecutive months",
    icon: "🎯",
    xpReward: 750,
    roleFilter: "CUSTOMER",
    category: "streak",
    tier: "platinum",
  },
];

// ────────────────────────────────────────────────────────────
// CLEANER ACHIEVEMENTS (13 achievements)
// ────────────────────────────────────────────────────────────

export const CLEANER_ACHIEVEMENTS: AchievementDefinition[] = [
  // Milestones
  {
    key: "first_job_completed",
    title: "First Clean",
    description: "Complete your first job",
    icon: "✨",
    xpReward: 50,
    roleFilter: "CLEANER",
    category: "milestone",
    tier: "bronze",
  },
  {
    key: "fifty_jobs",
    title: "Fifty Cleans",
    description: "Complete 50 jobs",
    icon: "🎖️",
    xpReward: 500,
    roleFilter: "CLEANER",
    category: "milestone",
    tier: "silver",
  },
  {
    key: "hundred_jobs",
    title: "Century Cleaner",
    description: "Complete 100 jobs",
    icon: "💯",
    xpReward: 1000,
    roleFilter: "CLEANER",
    category: "milestone",
    tier: "gold",
  },

  // Performance
  {
    key: "five_star_streak",
    title: "Five Star Streak",
    description: "Earn 5 consecutive 5-star ratings",
    icon: "⭐",
    xpReward: 200,
    roleFilter: "CLEANER",
    category: "performance",
    tier: "silver",
  },
  {
    key: "speed_demon",
    title: "Speed Demon",
    description: "Complete 10 jobs under estimated time",
    icon: "🚀",
    xpReward: 75,
    roleFilter: "CLEANER",
    category: "performance",
    tier: "bronze",
  },
  {
    key: "perfect_week",
    title: "Perfect Week",
    description: "Earn all 5-star ratings in a single week",
    icon: "🌟",
    xpReward: 300,
    roleFilter: "CLEANER",
    category: "performance",
    tier: "gold",
  },

  // Customer Relations
  {
    key: "customer_favorite",
    title: "Customer Favorite",
    description: "Be requested by name 5 times",
    icon: "❤️",
    xpReward: 200,
    roleFilter: "CLEANER",
    category: "engagement",
    tier: "silver",
  },
  {
    key: "zero_complaints",
    title: "Spotless Record",
    description: "Go 30 days without any complaints",
    icon: "🛡️",
    xpReward: 250,
    roleFilter: "CLEANER",
    category: "performance",
    tier: "gold",
  },

  // Team Collaboration
  {
    key: "team_player",
    title: "Team Player",
    description: "Help cover for absent teammates",
    icon: "🤝",
    xpReward: 100,
    roleFilter: "CLEANER",
    category: "engagement",
    tier: "bronze",
  },
  {
    key: "team_leader",
    title: "Team Leader",
    description: "Mentor a new cleaner to their first 5-star",
    icon: "👥",
    xpReward: 200,
    roleFilter: "CLEANER",
    category: "engagement",
    tier: "silver",
  },

  // Reliability
  {
    key: "early_bird",
    title: "Early Bird",
    description: "Arrive on time for 20 consecutive jobs",
    icon: "🐦",
    xpReward: 100,
    roleFilter: "CLEANER",
    category: "performance",
    tier: "bronze",
  },
  {
    key: "reliability_champion",
    title: "Reliability Champion",
    description: "Never cancel or no-show in a month",
    icon: "✅",
    xpReward: 200,
    roleFilter: "CLEANER",
    category: "performance",
    tier: "silver",
  },

  // Streak
  {
    key: "work_streak_30",
    title: "Consistent Earner",
    description: "Work 30 days in a row",
    icon: "🔥",
    xpReward: 250,
    roleFilter: "CLEANER",
    category: "streak",
    tier: "gold",
  },
];

// ────────────────────────────────────────────────────────────
// MANAGER ACHIEVEMENTS (10 achievements)
// ────────────────────────────────────────────────────────────

export const MANAGER_ACHIEVEMENTS: AchievementDefinition[] = [
  // Team Management
  {
    key: "team_builder",
    title: "Team Builder",
    description: "Onboard 3 cleaners",
    icon: "👥",
    xpReward: 200,
    roleFilter: "MANAGER",
    category: "milestone",
    tier: "bronze",
  },
  {
    key: "team_mentor",
    title: "Team Mentor",
    description: "Help 5 cleaners achieve their first 5-star rating",
    icon: "🌱",
    xpReward: 300,
    roleFilter: "MANAGER",
    category: "engagement",
    tier: "silver",
  },

  // Performance
  {
    key: "scheduling_ace",
    title: "Scheduling Ace",
    description: "Fill 50 job slots with excellent matches",
    icon: "📅",
    xpReward: 250,
    roleFilter: "MANAGER",
    category: "performance",
    tier: "silver",
  },
  {
    key: "perfect_month",
    title: "Perfect Month",
    description: "Zero missed appointments in a calendar month",
    icon: "📊",
    xpReward: 350,
    roleFilter: "MANAGER",
    category: "performance",
    tier: "gold",
  },

  // Customer Relations
  {
    key: "quick_responder",
    title: "Quick Responder",
    description: "Respond to all quotes within 1 hour for a week",
    icon: "⚡",
    xpReward: 200,
    roleFilter: "MANAGER",
    category: "performance",
    tier: "bronze",
  },
  {
    key: "customer_retention_master",
    title: "Customer Retention Master",
    description: "Achieve 90% retention rate in a month",
    icon: "📈",
    xpReward: 400,
    roleFilter: "MANAGER",
    category: "performance",
    tier: "gold",
  },

  // Operations
  {
    key: "quality_enforcer",
    title: "Quality Enforcer",
    description: "Maintain 4.8+ average cleaner rating",
    icon: "🏆",
    xpReward: 300,
    roleFilter: "MANAGER",
    category: "performance",
    tier: "silver",
  },
  {
    key: "pipeline_master",
    title: "Pipeline Master",
    description: "Close 10 leads in a month",
    icon: "🎯",
    xpReward: 300,
    roleFilter: "MANAGER",
    category: "milestone",
    tier: "silver",
  },

  // Growth
  {
    key: "revenue_goal_achiever",
    title: "Revenue Goal Achiever",
    description: "Hit monthly revenue target",
    icon: "💰",
    xpReward: 400,
    roleFilter: "MANAGER",
    category: "performance",
    tier: "gold",
  },
  {
    key: "growth_champion",
    title: "Growth Champion",
    description: "Increase monthly revenue by 20% month-over-month",
    icon: "🚀",
    xpReward: 500,
    roleFilter: "MANAGER",
    category: "performance",
    tier: "platinum",
  },
];

// ────────────────────────────────────────────────────────────
// ADMIN/HQ ACHIEVEMENTS (11 achievements)
// ────────────────────────────────────────────────────────────

export const ADMIN_ACHIEVEMENTS: AchievementDefinition[] = [
  // Team Building
  {
    key: "team_founder",
    title: "Team Founder",
    description: "Build a team of 10+ active members",
    icon: "👥",
    xpReward: 300,
    roleFilter: "HQ",
    category: "milestone",
    tier: "bronze",
  },
  {
    key: "leadership_milestone",
    title: "Leadership Milestone",
    description: "Manage 50+ active cleaners",
    icon: "👑",
    xpReward: 500,
    roleFilter: "HQ",
    category: "milestone",
    tier: "gold",
  },

  // Business Growth
  {
    key: "pipeline_pro",
    title: "Pipeline Pro",
    description: "Convert 10 leads to customers",
    icon: "📊",
    xpReward: 300,
    roleFilter: "HQ",
    category: "performance",
    tier: "bronze",
  },
  {
    key: "revenue_driver",
    title: "Revenue Driver",
    description: "Generate $10,000 in monthly revenue",
    icon: "💵",
    xpReward: 500,
    roleFilter: "HQ",
    category: "performance",
    tier: "gold",
  },
  {
    key: "growth_catalyst",
    title: "Growth Catalyst",
    description: "Achieve 100% month-over-month growth",
    icon: "📈",
    xpReward: 750,
    roleFilter: "HQ",
    category: "performance",
    tier: "platinum",
  },

  // Operational Excellence
  {
    key: "efficiency_expert",
    title: "Efficiency Expert",
    description: "Maintain 90%+ schedule fill rate",
    icon: "⚡",
    xpReward: 350,
    roleFilter: "HQ",
    category: "performance",
    tier: "silver",
  },
  {
    key: "operations_master",
    title: "Operations Master",
    description: "Zero critical incidents in 30 days",
    icon: "🛡️",
    xpReward: 400,
    roleFilter: "HQ",
    category: "performance",
    tier: "gold",
  },

  // Customer Satisfaction
  {
    key: "customer_champion",
    title: "Customer Champion",
    description: "Maintain 4.8+ average rating across all services",
    icon: "⭐",
    xpReward: 300,
    roleFilter: "HQ",
    category: "performance",
    tier: "silver",
  },
  {
    key: "retention_master",
    title: "Retention Master",
    description: "Achieve 85%+ customer retention rate",
    icon: "💚",
    xpReward: 400,
    roleFilter: "HQ",
    category: "performance",
    tier: "gold",
  },

  // Integrations & Growth
  {
    key: "technology_innovator",
    title: "Technology Innovator",
    description: "Set up 3+ integrations",
    icon: "🔗",
    xpReward: 250,
    roleFilter: "HQ",
    category: "engagement",
    tier: "bronze",
  },
  {
    key: "business_pioneer",
    title: "Business Pioneer",
    description: "First to achieve all major milestones",
    icon: "🌟",
    xpReward: 1000,
    roleFilter: "HQ",
    category: "milestone",
    tier: "platinum",
  },
];

// ────────────────────────────────────────────────────────────
// UNIVERSAL ACHIEVEMENTS (All Roles)
// ────────────────────────────────────────────────────────────

export const UNIVERSAL_ACHIEVEMENTS: AchievementDefinition[] = [
  {
    key: "welcome_aboard",
    title: "Welcome Aboard",
    description: "Log in for the first time",
    icon: "👋",
    xpReward: 5,
    roleFilter: "ALL",
    category: "general",
    tier: "bronze",
  },
  {
    key: "profile_complete",
    title: "Profile Complete",
    description: "Fill out your complete profile",
    icon: "📝",
    xpReward: 10,
    roleFilter: "ALL",
    category: "general",
    tier: "bronze",
  },
  {
    key: "daily_active",
    title: "Daily Active",
    description: "Log in 7 days in a row",
    icon: "📱",
    xpReward: 50,
    roleFilter: "ALL",
    category: "streak",
    tier: "bronze",
  },
  {
    key: "week_warrior",
    title: "Week Warrior",
    description: "Maintain activity for 14 consecutive days",
    icon: "💪",
    xpReward: 100,
    roleFilter: "ALL",
    category: "streak",
    tier: "silver",
  },
  {
    key: "hall_of_fame",
    title: "Hall of Fame",
    description: "Reach Level 15",
    icon: "🏅",
    xpReward: 0,
    roleFilter: "ALL",
    category: "milestone",
    tier: "platinum",
  },
];

// ────────────────────────────────────────────────────────────
// Master List of All Achievements
// ────────────────────────────────────────────────────────────

export const ALL_ACHIEVEMENTS = [
  ...UNIVERSAL_ACHIEVEMENTS,
  ...CUSTOMER_ACHIEVEMENTS,
  ...CLEANER_ACHIEVEMENTS,
  ...MANAGER_ACHIEVEMENTS,
  ...ADMIN_ACHIEVEMENTS,
];

// Utility function to get achievements by role
export function getAchievementsByRole(role: string): AchievementDefinition[] {
  const achievements: AchievementDefinition[] = [...UNIVERSAL_ACHIEVEMENTS];

  switch (role) {
    case "CUSTOMER":
      return [...achievements, ...CUSTOMER_ACHIEVEMENTS];
    case "CLEANER":
      return [...achievements, ...CLEANER_ACHIEVEMENTS];
    case "MANAGER":
      return [...achievements, ...MANAGER_ACHIEVEMENTS];
    case "HQ":
      return [...achievements, ...ADMIN_ACHIEVEMENTS];
    default:
      return achievements;
  }
}

// Get total possible XP for a role
export function getTotalPossibleXP(role: string): number {
  return getAchievementsByRole(role).reduce((sum, ach) => sum + ach.xpReward, 0);
}
