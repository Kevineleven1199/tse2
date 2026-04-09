/**
 * Social Media Publisher
 * Publishes posts to all major social platforms via their respective APIs.
 * Reads credentials from Integration table per tenant.
 */
import { prisma } from "@/lib/prisma";
import type { SocialPlatform, SocialPost } from "@prisma/client";
import type { PublishResult } from "./types";
import { publishToGoogleBusiness } from "./google-business";
import { publishToLinkedIn } from "./linkedin";
import { publishToYoutube } from "./youtube";
import { publishToPinterest } from "./pinterest";
import { publishToTiktok } from "./tiktok";
import { publishToThreads } from "./threads";

/**
 * Publish a social post to the target platform.
 */
export async function publishPost(post: SocialPost): Promise<PublishResult> {
  const publishers: Record<string, (post: SocialPost) => Promise<PublishResult>> = {
    FACEBOOK: publishToFacebook,
    INSTAGRAM: publishToInstagram,
    TWITTER_X: publishToTwitter,
    GOOGLE_BUSINESS: publishToGoogleBusiness,
    LINKEDIN: publishToLinkedIn,
    YOUTUBE: publishToYoutube,
    PINTEREST: publishToPinterest,
    TIKTOK: publishToTiktok,
    THREADS: publishToThreads,
  };

  const publisher = publishers[post.platform];
  if (!publisher) return { success: false, error: `Unsupported platform: ${post.platform}` };

  // Mark as publishing
  await prisma.socialPost.update({ where: { id: post.id }, data: { status: "PUBLISHING" } });

  const result = await publisher(post);

  // Update post status
  await prisma.socialPost.update({
    where: { id: post.id },
    data: result.success
      ? { status: "PUBLISHED", publishedAt: new Date(), externalPostId: result.externalPostId }
      : { status: "FAILED", errorMessage: result.error },
  });

  return result;
}

async function publishToFacebook(post: SocialPost): Promise<PublishResult> {
  try {
    const integration = await prisma.integration.findFirst({
      where: { type: "FACEBOOK", status: "ACTIVE" },
    });
    const config = (integration?.config as any) || {};
    const token = config.pageAccessToken || process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
    const pageId = config.pageId || process.env.FACEBOOK_PAGE_ID;
    if (!token || !pageId) return { success: false, error: "Facebook not configured" };

    const body: any = { message: post.content, access_token: token };

    // If there's a media URL, post as photo
    if (post.mediaUrls.length > 0) {
      body.url = post.mediaUrls[0];
      const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      return res.ok
        ? { success: true, externalPostId: data.post_id || data.id }
        : { success: false, error: data.error?.message || "Facebook API error" };
    }

    // Text-only post
    const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return res.ok
      ? { success: true, externalPostId: data.id }
      : { success: false, error: data.error?.message || "Facebook API error" };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function publishToInstagram(post: SocialPost): Promise<PublishResult> {
  try {
    const integration = await prisma.integration.findFirst({
      where: { type: "INSTAGRAM", status: "ACTIVE" },
    });
    const config = (integration?.config as any) || {};
    const token = config.pageAccessToken || process.env.INSTAGRAM_ACCESS_TOKEN;
    const igAccountId = config.accountId || process.env.INSTAGRAM_ACCOUNT_ID;
    if (!token || !igAccountId) return { success: false, error: "Instagram not configured" };

    const imageUrl = post.mediaUrls[0];
    if (!imageUrl) return { success: false, error: "Instagram requires an image" };

    // Step 1: Create media container
    const caption = post.hashtags.length > 0
      ? `${post.content}\n\n${post.hashtags.join(" ")}`
      : post.content;

    const createRes = await fetch(
      `https://graph.facebook.com/v19.0/${igAccountId}/media?image_url=${encodeURIComponent(imageUrl)}&caption=${encodeURIComponent(caption)}&access_token=${token}`,
      { method: "POST" },
    );
    const createData = await createRes.json();
    if (!createRes.ok) return { success: false, error: createData.error?.message };

    // Step 2: Publish the container
    const publishRes = await fetch(
      `https://graph.facebook.com/v19.0/${igAccountId}/media_publish?creation_id=${createData.id}&access_token=${token}`,
      { method: "POST" },
    );
    const publishData = await publishRes.json();
    return publishRes.ok
      ? { success: true, externalPostId: publishData.id }
      : { success: false, error: publishData.error?.message };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function publishToTwitter(post: SocialPost): Promise<PublishResult> {
  try {
    const integration = await prisma.integration.findFirst({
      where: { type: "TWITTER_X", status: "ACTIVE" },
    });
    const config = (integration?.config as any) || {};
    const bearerToken = config.bearerToken || process.env.TWITTER_BEARER_TOKEN;
    if (!bearerToken) return { success: false, error: "X/Twitter not configured" };

    const text = post.hashtags.length > 0
      ? `${post.content} ${post.hashtags.slice(0, 3).join(" ")}`.slice(0, 280)
      : post.content.slice(0, 280);

    const res = await fetch("https://api.x.com/2/tweets", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${bearerToken}` },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    return res.ok
      ? { success: true, externalPostId: data.data?.id }
      : { success: false, error: data.detail || "X API error" };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
