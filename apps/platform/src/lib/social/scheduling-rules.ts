/**
 * Platform-specific scheduling rules and best practices.
 * Based on 2025-2026 social media research for contractor/local business content.
 */
import type { SocialPlatform } from "@prisma/client";

export type PostingRecommendation = {
  platform: SocialPlatform;
  label: string;
  icon: string;
  color: string;

  /** Recommended posts per day */
  postsPerDay: number;
  /** Recommended posts per week */
  postsPerWeek: number;
  /** Max character count per post */
  maxChars: number;
  /** Whether media is required */
  mediaRequired: boolean;
  /** Best hours to post (24h format, local time) */
  bestHours: number[];
  /** Best days of week (0=Sun, 6=Sat) */
  bestDays: number[];
  /** Hashtag recommendations */
  hashtagLimit: number;
  /** Is API available for automated posting */
  apiAvailable: boolean;
  /** API cost/tier notes */
  apiNotes: string;
  /** Notes for content strategy */
  contentTips: string[];
};

export const PLATFORM_RULES: Record<string, PostingRecommendation> = {
  FACEBOOK: {
    platform: "FACEBOOK" as SocialPlatform,
    label: "Facebook",
    icon: "📘",
    color: "bg-blue-100 text-blue-700 border-blue-300",
    postsPerDay: 1,
    postsPerWeek: 5,
    maxChars: 500,
    mediaRequired: false,
    bestHours: [9, 13, 15], // 9am, 1pm, 3pm
    bestDays: [1, 2, 3, 4], // Mon-Thu
    hashtagLimit: 3,
    apiAvailable: true,
    apiNotes: "Free via Meta Graph API. Requires Page Access Token.",
    contentTips: [
      "Ask questions to drive engagement",
      "Include a call-to-action in every post",
      "Share project photos with context",
      "Use 1-3 hashtags max for best reach",
    ],
  },

  INSTAGRAM: {
    platform: "INSTAGRAM" as SocialPlatform,
    label: "Instagram",
    icon: "📷",
    color: "bg-pink-100 text-pink-700 border-pink-300",
    postsPerDay: 1,
    postsPerWeek: 5,
    maxChars: 2200,
    mediaRequired: true,
    bestHours: [11, 14, 17], // 11am, 2pm, 5pm
    bestDays: [1, 2, 3, 4, 5], // Mon-Fri
    hashtagLimit: 15,
    apiAvailable: true,
    apiNotes: "Free via Meta Graph API. Requires Instagram Business Account linked to Facebook Page.",
    contentTips: [
      "Image is REQUIRED — no text-only posts",
      "Use 10-15 relevant hashtags",
      "Before/after photos perform best",
      "Stories 3-5x daily for maximum reach",
      "Reels get 2x more reach than feed posts",
    ],
  },

  TWITTER_X: {
    platform: "TWITTER_X" as SocialPlatform,
    label: "X / Twitter",
    icon: "⬛",
    color: "bg-gray-100 text-gray-700 border-gray-300",
    postsPerDay: 4,
    postsPerWeek: 25,
    maxChars: 280,
    mediaRequired: false,
    bestHours: [8, 12, 15, 18], // 8am, noon, 3pm, 6pm
    bestDays: [1, 2, 3, 4, 5],
    hashtagLimit: 2,
    apiAvailable: true,
    apiNotes: "$100/mo Basic tier required for posting API access.",
    contentTips: [
      "Keep it under 280 characters INCLUDING hashtags and links",
      "Tweet 3-5 times per day for best reach",
      "Use max 1-2 hashtags (more hurts engagement)",
      "Engage with local businesses and customers",
    ],
  },

  TIKTOK: {
    platform: "TIKTOK" as SocialPlatform,
    label: "TikTok",
    icon: "🎵",
    color: "bg-red-100 text-red-700 border-red-300",
    postsPerDay: 2,
    postsPerWeek: 10,
    maxChars: 2200,
    mediaRequired: true,
    bestHours: [6, 10, 19, 22], // 6am, 10am, 7pm, 10pm
    bestDays: [1, 2, 3, 4, 5, 6],
    hashtagLimit: 5,
    apiAvailable: true,
    apiNotes: "Free via TikTok Content Posting API. Requires developer account approval.",
    contentTips: [
      "Video is REQUIRED — vertical 9:16 aspect ratio",
      "Under 60 seconds performs best",
      "Show time-lapse project videos",
      "Trending audio boosts reach significantly",
      "2-3 posts per day maximizes algorithm favor",
    ],
  },

  LINKEDIN: {
    platform: "LINKEDIN" as SocialPlatform,
    label: "LinkedIn",
    icon: "💼",
    color: "bg-sky-100 text-sky-700 border-sky-300",
    postsPerDay: 1,
    postsPerWeek: 3,
    maxChars: 3000,
    mediaRequired: false,
    bestHours: [8, 12, 17], // business hours
    bestDays: [2, 3, 4], // Tue-Thu
    hashtagLimit: 5,
    apiAvailable: true,
    apiNotes: "Free via LinkedIn Marketing API. Requires Company Page admin + OAuth.",
    contentTips: [
      "Professional tone — target commercial clients",
      "Case studies and commercial projects perform best",
      "Post Tue/Wed/Thu mornings for B2B reach",
      "Tag partner companies when relevant",
      "Industry insights get more engagement than promos",
    ],
  },

  GOOGLE_BUSINESS: {
    platform: "GOOGLE_BUSINESS" as SocialPlatform,
    label: "Google Business",
    icon: "🔵",
    color: "bg-red-50 text-red-600 border-red-200",
    postsPerDay: 0, // not daily — weekly is enough
    postsPerWeek: 3,
    maxChars: 1500,
    mediaRequired: false,
    bestHours: [9, 12, 16],
    bestDays: [1, 2, 3, 4],
    hashtagLimit: 0,
    apiAvailable: true,
    apiNotes: "Free via Google Business Profile API. CRITICAL for local SEO rankings.",
    contentTips: [
      "MASSIVE local SEO impact — ranks you higher in local pack",
      "Post 2-3x per week minimum",
      "Include a call-to-action button (Call Now, Get Quote, Learn More)",
      "Event and offer posts get top placement",
      "Photos get more views than text-only posts",
      "Updates keep your listing 'active' for Google algorithm",
    ],
  },

  YOUTUBE: {
    platform: "YOUTUBE" as SocialPlatform,
    label: "YouTube",
    icon: "▶️",
    color: "bg-red-100 text-red-700 border-red-300",
    postsPerDay: 0,
    postsPerWeek: 2,
    maxChars: 5000,
    mediaRequired: true,
    bestHours: [14, 17, 20], // 2pm, 5pm, 8pm
    bestDays: [4, 5, 6], // Thu-Sat
    hashtagLimit: 3,
    apiAvailable: true,
    apiNotes: "Free via YouTube Data API v3. Requires Google OAuth + channel verification.",
    contentTips: [
      "Video REQUIRED",
      "YouTube Shorts (under 60s) get 10x more reach",
      "Project walkthroughs and how-tos perform best",
      "SEO-optimize title, description, and tags",
      "Include timestamps in description for longer videos",
    ],
  },

  PINTEREST: {
    platform: "PINTEREST" as SocialPlatform,
    label: "Pinterest",
    icon: "📌",
    color: "bg-red-100 text-red-700 border-red-300",
    postsPerDay: 5,
    postsPerWeek: 25,
    maxChars: 500,
    mediaRequired: true,
    bestHours: [14, 20, 21], // 2pm, 8pm, 9pm
    bestDays: [0, 5, 6], // Sun, Fri, Sat
    hashtagLimit: 20,
    apiAvailable: true,
    apiNotes: "Free via Pinterest API v5. OAuth 2.0 required.",
    contentTips: [
      "Image REQUIRED (vertical 2:3 ratio best)",
      "Landscaping + home renovation = perfect Pinterest content",
      "5-10 pins per day is ideal",
      "Rich pins drive traffic back to your website",
      "Pinterest has LONG content life (months vs hours on IG)",
    ],
  },

  NEXTDOOR: {
    platform: "NEXTDOOR" as SocialPlatform,
    label: "Nextdoor",
    icon: "🏡",
    color: "bg-lime-100 text-lime-700 border-lime-300",
    postsPerDay: 0,
    postsPerWeek: 2,
    maxChars: 1000,
    mediaRequired: false,
    bestHours: [10, 14, 18],
    bestDays: [1, 2, 3, 4, 5, 6],
    hashtagLimit: 0,
    apiAvailable: false,
    apiNotes: "NO public posting API. Manual posting required. Business Pro account recommended.",
    contentTips: [
      "HIGHEST-converting platform for local contractors",
      "Hyper-local reach — neighbors trust neighbors",
      "Post 1-2x per week with helpful tips",
      "Respond to every comment and message quickly",
      "Offer neighborhood-exclusive discounts",
      "Recommendations are gold — ask happy customers",
    ],
  },

  THREADS: {
    platform: "THREADS" as SocialPlatform,
    label: "Threads",
    icon: "🧵",
    color: "bg-gray-100 text-gray-800 border-gray-300",
    postsPerDay: 2,
    postsPerWeek: 10,
    maxChars: 500,
    mediaRequired: false,
    bestHours: [10, 14, 18],
    bestDays: [1, 2, 3, 4, 5],
    hashtagLimit: 3,
    apiAvailable: true,
    apiNotes: "Free via Meta Threads API (released 2024). Requires Instagram Business Account.",
    contentTips: [
      "Conversational tone — like a text message to friends",
      "Post 2-3x daily for best reach",
      "Short, punchy content outperforms long posts",
      "Cross-post from Instagram with modifications",
    ],
  },
};

/**
 * Calculate the optimal posting time for a given platform and date.
 * Returns the next available best-hour slot.
 */
export function getOptimalPostTime(
  platform: SocialPlatform,
  fromDate: Date = new Date(),
): Date {
  const rule = PLATFORM_RULES[platform];
  if (!rule) return fromDate;

  const result = new Date(fromDate);
  const currentHour = result.getHours();

  // Find the next best hour today
  const nextHour = rule.bestHours.find((h) => h > currentHour);
  if (nextHour !== undefined) {
    result.setHours(nextHour, 0, 0, 0);
    return result;
  }

  // Otherwise, first best hour tomorrow
  result.setDate(result.getDate() + 1);
  result.setHours(rule.bestHours[0], 0, 0, 0);
  return result;
}

/**
 * Generate a weekly posting schedule for a platform.
 * Returns dates for each recommended post this week.
 */
export function generateWeeklySchedule(
  platform: SocialPlatform,
  weekStart: Date = new Date(),
): Date[] {
  const rule = PLATFORM_RULES[platform];
  if (!rule) return [];

  const schedule: Date[] = [];
  const start = new Date(weekStart);
  start.setHours(0, 0, 0, 0);

  let postsAdded = 0;
  const targetPosts = rule.postsPerWeek;

  for (let dayOffset = 0; dayOffset < 7 && postsAdded < targetPosts; dayOffset++) {
    const day = new Date(start);
    day.setDate(day.getDate() + dayOffset);
    const dayOfWeek = day.getDay();

    // Skip non-best days unless we still need posts
    if (!rule.bestDays.includes(dayOfWeek) && postsAdded < targetPosts - 2) continue;

    // How many posts today? Distribute evenly
    const postsToday = Math.min(
      rule.postsPerDay || 1,
      targetPosts - postsAdded,
      rule.bestHours.length,
    );

    for (let i = 0; i < postsToday; i++) {
      const slot = new Date(day);
      slot.setHours(rule.bestHours[i % rule.bestHours.length], 0, 0, 0);
      if (slot > new Date()) {
        schedule.push(slot);
        postsAdded++;
      }
    }
  }

  return schedule;
}

/**
 * Get all platform rules as an array for iteration.
 */
export function getAllPlatforms(): PostingRecommendation[] {
  return Object.values(PLATFORM_RULES);
}

/**
 * Calculate total recommended posts across all platforms per week.
 */
export function getTotalRecommendedPostsPerWeek(): number {
  return getAllPlatforms().reduce((sum, p) => sum + p.postsPerWeek, 0);
}
