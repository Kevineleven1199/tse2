/**
 * Level System for TriState Gamification
 * 20 levels with progressive XP requirements and perks
 */

export interface LevelInfo {
  level: number;
  name: string;
  title: string;
  badge: string;
  xpRequired: number; // Cumulative XP to reach this level
  perks: string[];
  color: string; // Tailwind color class
  unlockReward?: string; // Special reward at this level
}

const LEVELS: LevelInfo[] = [
  {
    level: 1,
    name: "Rising Star",
    title: "Just Starting",
    badge: "⭐",
    xpRequired: 0,
    perks: ["Access to basic features"],
    color: "from-blue-400 to-blue-600",
  },
  {
    level: 2,
    name: "Green Starter",
    title: "Getting Started",
    badge: "🌱",
    xpRequired: 50,
    perks: ["View leaderboard", "Achievement tracking"],
    color: "from-green-400 to-green-600",
  },
  {
    level: 3,
    name: "Eco Explorer",
    title: "Growing Knowledge",
    badge: "🔍",
    xpRequired: 150,
    perks: ["Access premium tips"],
    color: "from-emerald-400 to-emerald-600",
  },
  {
    level: 4,
    name: "Clean Champion",
    title: "Gaining Momentum",
    badge: "🏆",
    xpRequired: 300,
    perks: ["Unlock profile badge"],
    color: "from-yellow-400 to-yellow-600",
  },
  {
    level: 5,
    name: "Green Guardian",
    title: "Trusted Member",
    badge: "💚",
    xpRequired: 500,
    perks: ["5% service discount (customers)", "Priority scheduling (cleaners)"],
    color: "from-teal-400 to-teal-600",
    unlockReward: "5% Discount",
  },
  {
    level: 6,
    name: "Sustainability Guide",
    title: "Expert Contributor",
    badge: "🌿",
    xpRequired: 750,
    perks: ["Access to exclusive content"],
    color: "from-lime-400 to-lime-600",
  },
  {
    level: 7,
    name: "Eco Enthusiast",
    title: "Valued Community Member",
    badge: "🌍",
    xpRequired: 1050,
    perks: ["Networking badge"],
    color: "from-cyan-400 to-cyan-600",
  },
  {
    level: 8,
    name: "Green Master",
    title: "Respected Professional",
    badge: "🎓",
    xpRequired: 1400,
    perks: ["10% service discount (customers)", "Priority support"],
    color: "from-indigo-400 to-indigo-600",
    unlockReward: "10% Discount",
  },
  {
    level: 9,
    name: "Sustainability Advocate",
    title: "Community Leader",
    badge: "📢",
    xpRequired: 1800,
    perks: ["Exclusive community events"],
    color: "from-purple-400 to-purple-600",
  },
  {
    level: 10,
    name: "Environmental Champion",
    title: "Established Expert",
    badge: "👑",
    xpRequired: 2300,
    perks: ["VIP status", "Dedicated account manager"],
    color: "from-pink-400 to-pink-600",
    unlockReward: "VIP Status",
  },
  {
    level: 11,
    name: "Green Visionary",
    title: "Influential Contributor",
    badge: "✨",
    xpRequired: 2900,
    perks: ["Early access to new features"],
    color: "from-rose-400 to-rose-600",
  },
  {
    level: 12,
    name: "Eco Influencer",
    title: "Industry Insider",
    badge: "🌟",
    xpRequired: 3600,
    perks: ["15% service discount", "Priority everything"],
    color: "from-orange-400 to-orange-600",
    unlockReward: "15% Discount",
  },
  {
    level: 13,
    name: "Sustainability Luminary",
    title: "Thought Leader",
    badge: "💫",
    xpRequired: 4400,
    perks: ["Featured in community highlights"],
    color: "from-amber-400 to-amber-600",
  },
  {
    level: 14,
    name: "TriState Pioneer",
    title: "Legendary Member",
    badge: "🚀",
    xpRequired: 5300,
    perks: ["Custom profile badge", "Exclusive perks"],
    color: "from-fuchsia-400 to-fuchsia-600",
  },
  {
    level: 15,
    name: "TriState Legend",
    title: "Icon of Excellence",
    badge: "🏅",
    xpRequired: 6400,
    perks: ["20% service discount", "Hall of fame placement", "Monthly bonus"],
    color: "from-violet-400 to-violet-600",
    unlockReward: "20% Discount + Hall of Fame",
  },
  {
    level: 16,
    name: "Sustainability Oracle",
    title: "Master of Ecosystem",
    badge: "🔮",
    xpRequired: 7600,
    perks: ["Influencer partnership opportunities"],
    color: "from-red-400 to-red-600",
  },
  {
    level: 17,
    name: "Environmental Deity",
    title: "Peak Excellence",
    badge: "⚡",
    xpRequired: 9000,
    perks: ["Lifetime premium features"],
    color: "from-cyan-300 to-blue-600",
  },
  {
    level: 18,
    name: "TriState Architect",
    title: "Visionary Supreme",
    badge: "🏗️",
    xpRequired: 10600,
    perks: ["Shape platform features", "Executive council"],
    color: "from-blue-300 to-purple-600",
  },
  {
    level: 19,
    name: "Ecosystem Guardian",
    title: "Custodian of Green",
    badge: "🛡️",
    xpRequired: 12400,
    perks: ["Ultimate VIP treatment"],
    color: "from-emerald-300 to-teal-600",
  },
  {
    level: 20,
    name: "TriState Master",
    title: "Supreme Legend",
    badge: "👑",
    xpRequired: 15000,
    perks: ["All perks unlocked", "Eternal recognition"],
    color: "from-yellow-300 to-orange-600",
    unlockReward: "Master Status + All Perks",
  },
];

/**
 * Calculate level, progress, and info from total XP
 */
export function calculateLevelInfo(totalXP: number): {
  level: number;
  levelInfo: LevelInfo;
  nextLevel?: LevelInfo;
  progress: number; // 0-100 percent
  xpInCurrentLevel: number;
  xpNeededForNext: number;
  isMaxLevel: boolean;
} {
  // Find current level
  let currentLevel = 1;
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalXP >= LEVELS[i].xpRequired) {
      currentLevel = LEVELS[i].level;
      break;
    }
  }

  const levelInfo = LEVELS[currentLevel - 1];
  const nextLevelInfo = currentLevel < LEVELS.length ? LEVELS[currentLevel] : undefined;

  // Calculate progress to next level
  let xpInCurrentLevel = 0;
  let xpNeededForNext = 0;
  let progress = 100;

  if (nextLevelInfo) {
    const currentLevelXP = levelInfo.xpRequired;
    const nextLevelXP = nextLevelInfo.xpRequired;
    xpInCurrentLevel = totalXP - currentLevelXP;
    xpNeededForNext = nextLevelXP - totalXP;
    progress = Math.min(
      100,
      Math.round(((totalXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100)
    );
  }

  return {
    level: currentLevel,
    levelInfo,
    nextLevel: nextLevelInfo,
    progress,
    xpInCurrentLevel,
    xpNeededForNext,
    isMaxLevel: currentLevel === LEVELS.length,
  };
}

/**
 * Get level info by level number
 */
export function getLevelByNumber(level: number): LevelInfo | null {
  return LEVELS.find((l) => l.level === level) || null;
}

/**
 * Get all levels
 */
export function getAllLevels(): LevelInfo[] {
  return LEVELS;
}

/**
 * Get levels in a range (for leaderboard display, etc)
 */
export function getLevelsInRange(startLevel: number, endLevel: number): LevelInfo[] {
  return LEVELS.filter((l) => l.level >= startLevel && l.level <= endLevel);
}

/**
 * Check if user has specific perk at their level
 */
export function hasPerk(totalXP: number, perk: string): boolean {
  const { level } = calculateLevelInfo(totalXP);
  const levelInfo = getLevelByNumber(level);
  return levelInfo?.perks.includes(perk) ?? false;
}

/**
 * Get all unlocked perks for a user
 */
export function getUnlockedPerks(totalXP: number): string[] {
  const { level } = calculateLevelInfo(totalXP);
  const perks = new Set<string>();

  for (let i = 1; i <= level && i < LEVELS.length; i++) {
    LEVELS[i - 1].perks.forEach((p) => perks.add(p));
  }

  return Array.from(perks);
}

/**
 * Get XP needed to reach a specific level
 */
export function getXPForLevel(level: number): number {
  const levelInfo = getLevelByNumber(level);
  return levelInfo?.xpRequired ?? 0;
}

/**
 * Get XP needed to level up from current level
 */
export function getXPNeededForNextLevel(totalXP: number): number {
  const { nextLevel } = calculateLevelInfo(totalXP);
  if (!nextLevel) return 0;
  return Math.max(0, nextLevel.xpRequired - totalXP);
}

/**
 * Get color gradient based on level
 */
export function getLevelColorGradient(level: number): string {
  const levelInfo = getLevelByNumber(level);
  return levelInfo?.color ?? "from-gray-400 to-gray-600";
}

/**
 * Format level display
 */
export function formatLevelDisplay(totalXP: number): {
  level: number;
  badge: string;
  name: string;
  title: string;
} {
  const { level, levelInfo } = calculateLevelInfo(totalXP);
  return {
    level,
    badge: levelInfo.badge,
    name: levelInfo.name,
    title: levelInfo.title,
  };
}
