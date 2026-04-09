/**
 * Bulk Content Generator
 *
 * Generates a full week's worth of social media posts across all platforms
 * following each platform's optimal posting frequency and timing rules.
 *
 * This is the core of the "max effort" content calendar — one click
 * creates ~60+ posts distributed across 10 platforms for the week ahead.
 */
import { prisma } from "@/lib/prisma";
import type { SocialPlatform } from "@prisma/client";
import { PLATFORM_RULES, generateWeeklySchedule, getAllPlatforms } from "./scheduling-rules";
import { generateFromTopic, generateFromBlog } from "./content-generator";

const DEFAULT_TENANT = process.env.DEFAULT_TENANT_ID || "ten_gogreen";

type BulkGenerateOptions = {
  tenantId?: string;
  weekStart?: Date;
  platforms?: SocialPlatform[];
  useBlogPosts?: boolean;
  useTemplates?: boolean;
  maxPostsPerPlatform?: number;
};

type BulkGenerateResult = {
  totalGenerated: number;
  byPlatform: Record<string, number>;
  posts: Array<{ id: string; platform: string; scheduledFor: Date }>;
  errors: string[];
};

const CONTENT_ROTATIONS = [
  { category: "project-showcase", topic: "Show off a recent construction/renovation project in the Tri-State area" },
  { category: "hvac-tip", topic: "Share a seasonal HVAC maintenance tip for homeowners" },
  { category: "landscaping-idea", topic: "Share a landscaping idea for the current season" },
  { category: "behind-scenes", topic: "Behind the scenes: what goes into a typical day at Tri State Enterprise" },
  { category: "team-spotlight", topic: "Spotlight on our experienced crew — 30+ years serving KY-OH-WV" },
  { category: "testimonial", topic: "Share a customer testimonial from a recent project" },
  { category: "before-after", topic: "Before and after transformation of a recent project" },
  { category: "service-reminder", topic: "Reminder about our free estimates — Construction, HVAC, Lawn, Landscaping, Paving" },
  { category: "local-community", topic: "Celebrating the Tri-State community we've served since 1992" },
  { category: "safety-tip", topic: "Home safety tip related to HVAC, electrical, or construction" },
  { category: "seasonal-service", topic: "Seasonal service reminder (summer AC tune-up, fall lawn prep, winter furnace check)" },
  { category: "why-choose-us", topic: "Why customers choose Tri State Enterprise: licensed, bonded, insured, 30+ years" },
  { category: "how-to", topic: "Simple how-to tip for homeowners (DIY vs when to call a pro)" },
  { category: "service-highlight", topic: "Highlight one of our 6 services with a clear call to action" },
];

/**
 * Generate a week of social media posts across all platforms.
 */
export async function generateWeeklyContent(
  options: BulkGenerateOptions = {},
): Promise<BulkGenerateResult> {
  const {
    tenantId = DEFAULT_TENANT,
    weekStart = new Date(),
    platforms = getAllPlatforms().map((p) => p.platform),
    useBlogPosts = true,
    maxPostsPerPlatform,
  } = options;

  const result: BulkGenerateResult = {
    totalGenerated: 0,
    byPlatform: {},
    posts: [],
    errors: [],
  };

  // Get the latest blog post to feature in some content
  const latestBlog = useBlogPosts
    ? await prisma.blogPost.findFirst({
        where: { published: true },
        orderBy: { publishedAt: "desc" },
      })
    : null;

  for (const platform of platforms) {
    const rule = PLATFORM_RULES[platform];
    if (!rule) continue;
    if (!rule.apiAvailable && platform !== "NEXTDOOR") continue; // skip non-API platforms (but keep Nextdoor for manual tracking)

    const schedule = generateWeeklySchedule(platform, weekStart);
    const postsToCreate = maxPostsPerPlatform
      ? schedule.slice(0, maxPostsPerPlatform)
      : schedule;

    result.byPlatform[platform] = 0;

    for (let i = 0; i < postsToCreate.length; i++) {
      try {
        // Rotate through content topics, occasionally featuring the blog
        const useBlog = useBlogPosts && latestBlog && i === 0;
        const rotationIndex = i % CONTENT_ROTATIONS.length;
        const rotation = CONTENT_ROTATIONS[rotationIndex];

        let content: string;
        let hashtags: string[];

        if (useBlog && latestBlog) {
          const variants = await generateFromBlog(
            latestBlog.title,
            latestBlog.excerpt,
            latestBlog.slug,
            [platform],
          );
          content = variants[0]?.content || latestBlog.excerpt;
          hashtags = variants[0]?.hashtags || [];
        } else {
          const variant = await generateFromTopic(rotation.topic, platform);
          content = variant.content;
          hashtags = variant.hashtags;
        }

        const post = await prisma.socialPost.create({
          data: {
            tenantId,
            platform,
            content,
            hashtags,
            status: "SCHEDULED",
            scheduledFor: postsToCreate[i],
            blogPostId: useBlog && latestBlog ? latestBlog.id : null,
            aiGenerated: true,
          },
        });

        result.posts.push({
          id: post.id,
          platform,
          scheduledFor: postsToCreate[i],
        });
        result.totalGenerated++;
        result.byPlatform[platform]++;
      } catch (err: any) {
        result.errors.push(`${platform} slot ${i}: ${err.message}`);
      }
    }
  }

  return result;
}

/**
 * Generate content for a specific date range (not just a week).
 */
export async function generateContentForRange(
  startDate: Date,
  endDate: Date,
  tenantId: string = DEFAULT_TENANT,
): Promise<BulkGenerateResult> {
  const daysInRange = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const weeks = Math.ceil(daysInRange / 7);

  const combined: BulkGenerateResult = {
    totalGenerated: 0,
    byPlatform: {},
    posts: [],
    errors: [],
  };

  for (let w = 0; w < weeks; w++) {
    const weekStart = new Date(startDate);
    weekStart.setDate(weekStart.getDate() + w * 7);

    const weekResult = await generateWeeklyContent({ tenantId, weekStart });

    combined.totalGenerated += weekResult.totalGenerated;
    combined.posts.push(...weekResult.posts);
    combined.errors.push(...weekResult.errors);

    for (const [platform, count] of Object.entries(weekResult.byPlatform)) {
      combined.byPlatform[platform] = (combined.byPlatform[platform] || 0) + count;
    }
  }

  return combined;
}
