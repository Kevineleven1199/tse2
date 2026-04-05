/**
 * Community Features Library
 *
 * The public community and employee feed now persist through the real database.
 * Empty states are allowed; fake posts, fake reactions, and local-only feed data are not.
 */

export type PostCategory =
  | "cleaning_tip"
  | "project_tip"
  | "eco_tip"
  | "recommendation"
  | "question"
  | "cleaner_spotlight"
  | "promotion"
  | "announcement"
  | "before_after";

export type ReactionType = "like" | "helpful" | "love" | "celebrate";
export type CommunityAudience = "public" | "team";
export type CommunityAuthorRole = "client" | "cleaner" | "admin" | "tse";

export type CommunityPost = {
  id: string;
  category: PostCategory;
  title: string;
  body: string;
  mediaUrls: string[];
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorRole: CommunityAuthorRole;
  authorBadge?: string;
  neighborhood: string;
  city: string;
  reactions: {
    type: ReactionType;
    count: number;
    userReacted: boolean;
  }[];
  commentCount: number;
  viewCount: number;
  isPinned: boolean;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type Comment = {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorRole: CommunityAuthorRole;
  authorBadge?: string;
  body: string;
  reactions: {
    type: ReactionType;
    count: number;
    userReacted: boolean;
  }[];
  replies: Comment[];
  createdAt: Date;
};

export type CleanerSpotlight = {
  id: string;
  cleanerId: string;
  cleanerName: string;
  cleanerAvatar: string;
  title: string;
  story: string;
  achievements: string[];
  rating: number;
  totalJobs: number;
  yearsWithTriState: number;
  specialties: string[];
  neighborhood: string;
  testimonials: {
    clientName: string;
    text: string;
    rating: number;
  }[];
  createdAt: Date;
};

export type LocalDeal = {
  id: string;
  title: string;
  description: string;
  discountPercent?: number;
  discountAmount?: number;
  code?: string;
  validUntil: Date;
  terms: string;
  category: "cleaning" | "eco_product" | "home_service" | "local_business";
  partnerName?: string;
  partnerLogo?: string;
  isExclusive: boolean;
  redemptions: number;
  maxRedemptions?: number;
};

export type NeighborhoodStats = {
  neighborhood: string;
  city: string;
  totalMembers: number;
  activeCleaners: number;
  postsThisMonth: number;
  topContributors: {
    id: string;
    name: string;
    avatar?: string;
    postCount: number;
  }[];
  popularTopics: {
    tag: string;
    count: number;
  }[];
  recentActivity: {
    type: "post" | "comment" | "reaction" | "new_member";
    description: string;
    timestamp: Date;
  }[];
};

export type CommunityFeed = {
  posts: CommunityPost[];
  spotlights: CleanerSpotlight[];
  deals: LocalDeal[];
  stats: NeighborhoodStats;
  hasMore: boolean;
  nextCursor?: string;
};

type CreateCommunityPostInput = {
  tenantId: string;
  audience: CommunityAudience;
  category: PostCategory;
  title: string;
  body: string;
  authorName: string;
  authorRole: CommunityAuthorRole;
  authorBadge?: string;
  authorUserId?: string | null;
  neighborhood?: string;
  city?: string;
  mediaUrls?: string[];
  isPinned?: boolean;
  isVerified?: boolean;
};

type CreateCommunityCommentInput = {
  postId: string;
  authorName: string;
  authorRole: CommunityAuthorRole;
  authorBadge?: string;
  authorUserId?: string | null;
  body: string;
};

type ToggleCommunityReactionInput = {
  postId: string;
  reaction: ReactionType;
  actorKey: string;
  actorName?: string;
  authorUserId?: string | null;
};

type TrackCommunityViewInput = {
  postId: string;
  actorKey: string;
};

const CATEGORY_TO_DB = {
  cleaning_tip: "CLEANING_TIP",
  eco_tip: "ECO_TIP",
  recommendation: "RECOMMENDATION",
  question: "QUESTION",
  cleaner_spotlight: "CLEANER_SPOTLIGHT",
  promotion: "PROMOTION",
  announcement: "ANNOUNCEMENT",
  before_after: "BEFORE_AFTER",
} as const;

const DB_TO_CATEGORY: Record<string, PostCategory> = {
  CLEANING_TIP: "cleaning_tip",
  ECO_TIP: "eco_tip",
  RECOMMENDATION: "recommendation",
  QUESTION: "question",
  CLEANER_SPOTLIGHT: "cleaner_spotlight",
  PROMOTION: "promotion",
  ANNOUNCEMENT: "announcement",
  BEFORE_AFTER: "before_after",
};

const REACTION_TO_DB = {
  like: "LIKE",
  helpful: "HELPFUL",
  love: "LOVE",
  celebrate: "CELEBRATE",
} as const;

const DB_TO_REACTION: Record<string, ReactionType> = {
  LIKE: "like",
  HELPFUL: "helpful",
  LOVE: "love",
  CELEBRATE: "celebrate",
};

const AUTHOR_ROLE_TO_DB = {
  client: "CLIENT",
  cleaner: "CLEANER",
  admin: "ADMIN",
  tse: "TRISTATE",
} as const;

const DB_TO_AUTHOR_ROLE: Record<string, CommunityAuthorRole> = {
  CLIENT: "client",
  CLEANER: "cleaner",
  ADMIN: "admin",
  TRISTATE: "tse",
};

const AUDIENCE_TO_DB = {
  public: "PUBLIC",
  team: "TEAM",
} as const;

const EMPTY_REACTIONS: ReactionType[] = ["like", "helpful", "love", "celebrate"];

export const POST_CATEGORIES: Record<PostCategory, { label: string; icon: string; color: string }> = {
  cleaning_tip: { label: "Cleaning Tip", icon: "✨", color: "bg-blue-100 text-blue-700" },
  eco_tip: { label: "Eco Tip", icon: "🌱", color: "bg-green-100 text-green-700" },
  recommendation: { label: "Recommendation", icon: "👍", color: "bg-purple-100 text-purple-700" },
  question: { label: "Question", icon: "❓", color: "bg-amber-100 text-amber-700" },
  cleaner_spotlight: { label: "Cleaner Spotlight", icon: "⭐", color: "bg-yellow-100 text-yellow-700" },
  promotion: { label: "Deal", icon: "🎁", color: "bg-pink-100 text-pink-700" },
  announcement: { label: "Announcement", icon: "📢", color: "bg-red-100 text-red-700" },
  before_after: { label: "Before & After", icon: "📸", color: "bg-indigo-100 text-indigo-700" },
};

export const REACTION_TYPES: Record<ReactionType, { label: string; icon: string }> = {
  like: { label: "Like", icon: "👍" },
  helpful: { label: "Helpful", icon: "💡" },
  love: { label: "Love", icon: "❤️" },
  celebrate: { label: "Celebrate", icon: "🎉" },
};

const getEmptyNeighborhoodStats = (neighborhood: string): NeighborhoodStats => ({
  neighborhood,
  city: "",
  totalMembers: 0,
  activeCleaners: 0,
  postsThisMonth: 0,
  topContributors: [],
  popularTopics: [],
  recentActivity: [],
});

const buildReactionSummary = (
  rows: Array<{ reaction: string; actorKey: string }>,
  actorKey?: string
) =>
  EMPTY_REACTIONS.map((type) => ({
    type,
    count: rows.filter((row) => DB_TO_REACTION[row.reaction] === type).length,
    userReacted: actorKey ? rows.some((row) => row.actorKey === actorKey && DB_TO_REACTION[row.reaction] === type) : false,
  }));

const mapCommunityPost = (
  post: {
    id: string;
    title: string;
    body: string;
    mediaUrl: string | null;
    mediaUrls: string[];
    authorName: string;
    authorRole: string;
    authorBadge: string | null;
    authorUserId: string | null;
    neighborhood: string;
    city: string | null;
    isPinned: boolean;
    isVerified: boolean;
    category: string;
    publishedAt: Date;
    updatedAt: Date;
    reactions: Array<{ reaction: string; actorKey: string }>;
    comments: Array<{ id: string }>;
    views: Array<{ id: string }>;
  },
  actorKey?: string
): CommunityPost => {
  const mediaUrls = post.mediaUrls.length > 0
    ? post.mediaUrls
    : post.mediaUrl
      ? [post.mediaUrl]
      : [];

  return {
    id: post.id,
    category: DB_TO_CATEGORY[post.category] ?? "announcement",
    title: post.title,
    body: post.body,
    mediaUrls,
    authorId: post.authorUserId ?? post.id,
    authorName: post.authorName,
    authorRole: DB_TO_AUTHOR_ROLE[post.authorRole] ?? "tse",
    authorBadge: post.authorBadge ?? undefined,
    neighborhood: post.neighborhood || "Community",
    city: post.city || "",
    reactions: buildReactionSummary(post.reactions, actorKey),
    commentCount: post.comments.length,
    viewCount: post.views.length,
    isPinned: post.isPinned,
    isVerified: post.isVerified,
    createdAt: post.publishedAt,
    updatedAt: post.updatedAt,
  };
};

const mapCommunityComment = (comment: {
  id: string;
  postId: string;
  authorName: string;
  authorRole: string;
  authorBadge: string | null;
  authorUserId: string | null;
  body: string;
  createdAt: Date;
}): Comment => ({
  id: comment.id,
  postId: comment.postId,
  authorId: comment.authorUserId ?? comment.id,
  authorName: comment.authorName,
  authorRole: DB_TO_AUTHOR_ROLE[comment.authorRole] ?? "client",
  authorBadge: comment.authorBadge ?? undefined,
  body: comment.body,
  reactions: [],
  replies: [],
  createdAt: comment.createdAt,
});

export const getMockCommunityPosts = (_neighborhood: string): CommunityPost[] => [];
export const getMockLocalDeals = (): LocalDeal[] => [];
export const getMockNeighborhoodStats = (neighborhood: string): NeighborhoodStats =>
  getEmptyNeighborhoodStats(neighborhood);
export const getMockCleanerSpotlight = (): CleanerSpotlight | null => null;

export const getCommunityFeed = async (
  neighborhood: string,
  category?: PostCategory,
  _cursor?: string,
  audience: CommunityAudience = "public",
  tenantIdOverride?: string
): Promise<CommunityFeed> => {
  try {
    const { prisma } = await import("@/lib/prisma");
    const tenantId = tenantIdOverride ?? process.env.DEFAULT_TENANT_ID ?? "";

    if (!tenantId) {
      return {
        posts: [],
        spotlights: [],
        deals: [],
        stats: getEmptyNeighborhoodStats(neighborhood),
        hasMore: false,
      };
    }

    const dbPosts = await prisma.communityPost.findMany({
      where: {
        tenantId,
        audience: AUDIENCE_TO_DB[audience],
        ...(category ? { category: CATEGORY_TO_DB[category] } : {}),
      },
      orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
      take: 30,
      include: {
        comments: { select: { id: true } },
        views: { select: { id: true } },
        reactions: { select: { reaction: true, actorKey: true } },
      },
    });

    return {
      posts: dbPosts.map((post) => mapCommunityPost(post)),
      spotlights: [],
      deals: [],
      stats: await getRealNeighborhoodStats(tenantId, neighborhood, audience),
      hasMore: false,
    };
  } catch (error) {
    console.error("[community] Failed to load feed:", error);
    return {
      posts: [],
      spotlights: [],
      deals: [],
      stats: getEmptyNeighborhoodStats(neighborhood),
      hasMore: false,
    };
  }
};

async function getRealNeighborhoodStats(
  tenantId: string,
  neighborhood: string,
  audience: CommunityAudience
): Promise<NeighborhoodStats> {
  try {
    const { prisma } = await import("@/lib/prisma");
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const latestPosts = await prisma.communityPost.findMany({
      where: {
        tenantId,
        audience: AUDIENCE_TO_DB[audience],
      },
      orderBy: { publishedAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        authorName: true,
        publishedAt: true,
      },
    });

    const [memberCount, cleanerCount, postCount] = await Promise.all([
      prisma.user.count({ where: { tenantId, role: "CUSTOMER" } }),
      prisma.cleanerProfile.count({ where: { user: { tenantId }, active: true } }),
      prisma.communityPost.count({
        where: {
          tenantId,
          audience: AUDIENCE_TO_DB[audience],
          publishedAt: { gte: monthStart },
        },
      }),
    ]);

    return {
      neighborhood,
      city: "",
      totalMembers: memberCount,
      activeCleaners: cleanerCount,
      postsThisMonth: postCount,
      topContributors: [],
      popularTopics: [],
      recentActivity: latestPosts.map((post) => ({
        type: "post" as const,
        description: `${post.authorName} posted "${post.title}"`,
        timestamp: post.publishedAt,
      })),
    };
  } catch {
    return getEmptyNeighborhoodStats(neighborhood);
  }
}

export const getPostById = async (
  postId: string,
  actorKey?: string
): Promise<CommunityPost | null> => {
  try {
    const { prisma } = await import("@/lib/prisma");
    const post = await prisma.communityPost.findUnique({
      where: { id: postId },
      include: {
        comments: { select: { id: true } },
        views: { select: { id: true } },
        reactions: { select: { reaction: true, actorKey: true } },
      },
    });

    return post ? mapCommunityPost(post, actorKey) : null;
  } catch (error) {
    console.error("[community] Failed to load post:", error);
    return null;
  }
};

export const getPostComments = async (postId: string): Promise<Comment[]> => {
  try {
    const { prisma } = await import("@/lib/prisma");
    const comments = await prisma.communityComment.findMany({
      where: { postId },
      orderBy: { createdAt: "asc" },
    });

    return comments.map((comment) => mapCommunityComment(comment));
  } catch (error) {
    console.error("[community] Failed to load comments:", error);
    return [];
  }
};

export const createCommunityPost = async (input: CreateCommunityPostInput) => {
  const { prisma } = await import("@/lib/prisma");

  const created = await prisma.communityPost.create({
    data: {
      tenantId: input.tenantId,
      audience: AUDIENCE_TO_DB[input.audience],
      category: CATEGORY_TO_DB[input.category],
      title: input.title.trim(),
      body: input.body.trim(),
      mediaUrls: input.mediaUrls ?? [],
      authorName: input.authorName.trim(),
      authorRole: AUTHOR_ROLE_TO_DB[input.authorRole],
      authorBadge: input.authorBadge,
      authorUserId: input.authorUserId ?? null,
      neighborhood: input.neighborhood ?? (input.audience === "team" ? "TriState Team" : "Community"),
      city: input.city ?? "",
      isPinned: input.isPinned ?? false,
      isVerified: input.isVerified ?? (input.authorRole === "admin" || input.authorRole === "tse"),
    },
    include: {
      comments: { select: { id: true } },
      views: { select: { id: true } },
      reactions: { select: { reaction: true, actorKey: true } },
    },
  });

  return mapCommunityPost(created);
};

export const addCommunityComment = async (input: CreateCommunityCommentInput) => {
  const { prisma } = await import("@/lib/prisma");

  const comment = await prisma.communityComment.create({
    data: {
      postId: input.postId,
      authorName: input.authorName.trim(),
      authorRole: AUTHOR_ROLE_TO_DB[input.authorRole],
      authorBadge: input.authorBadge,
      authorUserId: input.authorUserId ?? null,
      body: input.body.trim(),
    },
  });

  return mapCommunityComment(comment);
};

export const toggleCommunityReaction = async (input: ToggleCommunityReactionInput) => {
  const { prisma } = await import("@/lib/prisma");
  const reaction = REACTION_TO_DB[input.reaction];

  await prisma.$transaction(async (tx) => {
    const existing = await tx.communityReaction.findUnique({
      where: {
        postId_actorKey_reaction: {
          postId: input.postId,
          actorKey: input.actorKey,
          reaction,
        },
      },
    });

    if (existing) {
      await tx.communityReaction.delete({ where: { id: existing.id } });
      return;
    }

    await tx.communityReaction.create({
      data: {
        postId: input.postId,
        actorKey: input.actorKey,
        actorName: input.actorName,
        authorUserId: input.authorUserId ?? null,
        reaction,
      },
    });
  });

  const post = await getPostById(input.postId, input.actorKey);
  const userReactions = post?.reactions.filter((item) => item.userReacted).map((item) => item.type) ?? [];

  return { post, userReactions };
};

export const trackCommunityView = async (input: TrackCommunityViewInput) => {
  const { prisma } = await import("@/lib/prisma");

  await prisma.communityView.upsert({
    where: {
      postId_actorKey: {
        postId: input.postId,
        actorKey: input.actorKey,
      },
    },
    update: {},
    create: {
      postId: input.postId,
      actorKey: input.actorKey,
    },
  });
};

export const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(date));
};

export const getTotalReactions = (reactions: CommunityPost["reactions"]): number =>
  reactions.reduce((sum, reaction) => sum + reaction.count, 0);

export const getAuthorBadgeStyle = (role: CommunityPost["authorRole"]): string => {
  switch (role) {
    case "tse":
      return "bg-brand-100 text-brand-700";
    case "admin":
      return "bg-purple-100 text-purple-700";
    case "cleaner":
      return "bg-green-100 text-green-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};
