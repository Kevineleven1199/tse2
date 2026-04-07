/**
 * Content Pipeline: Blog → Social → Newsletter
 * When a blog post is published, this generates social media variants
 * spread across the week and flags the post for newsletter inclusion.
 */
import { prisma } from "@/lib/prisma";
import { generateFromBlog, getSeasonalTopic, generateFromTopic } from "./social/content-generator";
import type { SocialPlatform } from "@prisma/client";

const DEFAULT_TENANT = process.env.DEFAULT_TENANT_ID || "ten_gogreen";

/**
 * Called after a blog post is published.
 * Generates social media posts spread across the week.
 */
export async function onBlogPostPublished(postId: string) {
  const post = await prisma.blogPost.findUniqueOrThrow({ where: { id: postId } });
  if (post.socialPostsGenerated) return; // already done

  const platforms: SocialPlatform[] = ["FACEBOOK", "INSTAGRAM", "TWITTER_X"];
  const variants = await generateFromBlog(post.title, post.excerpt, post.slug, platforms);

  const now = new Date();
  const schedule: { platform: SocialPlatform; dayOffset: number }[] = [
    { platform: "FACEBOOK", dayOffset: 0 },       // Day 0: Facebook
    { platform: "TWITTER_X", dayOffset: 1 },       // Day 1: X/Twitter
    { platform: "INSTAGRAM", dayOffset: 2 },       // Day 2: Instagram
    { platform: "TWITTER_X", dayOffset: 3 },       // Day 3: X reshare
    { platform: "FACEBOOK", dayOffset: 5 },         // Day 5: FB reminder
  ];

  for (const slot of schedule) {
    const variant = variants.find((v) => v.platform === slot.platform);
    if (!variant) continue;

    const scheduledFor = new Date(now);
    scheduledFor.setDate(scheduledFor.getDate() + slot.dayOffset);
    scheduledFor.setHours(10, 0, 0, 0); // 10 AM local

    // For reshares, slightly modify the content
    const content = slot.dayOffset > 2
      ? `icymi \u2014 ${variant.content}`
      : variant.content;

    await prisma.socialPost.create({
      data: {
        tenantId: post.tenantId,
        platform: slot.platform,
        content,
        hashtags: variant.hashtags,
        status: "SCHEDULED",
        scheduledFor,
        blogPostId: post.id,
        aiGenerated: true,
      },
    });
  }

  await prisma.blogPost.update({
    where: { id: postId },
    data: { socialPostsGenerated: true },
  });

  console.log(`[content-pipeline] Generated ${schedule.length} social posts for blog: ${post.title}`);
}

/**
 * Generate a daily social post from seasonal topics (not tied to a blog post).
 */
export async function generateDailySocialPost(tenantId: string = DEFAULT_TENANT) {
  const topic = getSeasonalTopic();
  const platforms: SocialPlatform[] = ["FACEBOOK", "TWITTER_X"];

  for (const platform of platforms) {
    const variant = await generateFromTopic(topic, platform);

    const scheduledFor = new Date();
    scheduledFor.setHours(12, 0, 0, 0); // noon

    await prisma.socialPost.create({
      data: {
        tenantId,
        platform,
        content: variant.content,
        hashtags: variant.hashtags,
        status: "SCHEDULED",
        scheduledFor,
        aiGenerated: true,
      },
    });
  }
}
