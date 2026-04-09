/**
 * Meta Threads adapter.
 *
 * API: Threads API (released 2024)
 * Docs: https://developers.facebook.com/docs/threads
 *
 * Uses same Meta OAuth infrastructure as Facebook/Instagram.
 * Requires Instagram Business Account linked.
 */
import { prisma } from "@/lib/prisma";
import type { SocialPost } from "@prisma/client";
import type { PublishResult } from "./types";

export async function publishToThreads(post: SocialPost): Promise<PublishResult> {
  try {
    const integration = await prisma.integration.findFirst({
      where: { type: "INSTAGRAM", status: "ACTIVE" },
    });
    const config = (integration?.config as any) || {};

    const accessToken = config.threadsAccessToken || config.pageAccessToken || process.env.THREADS_ACCESS_TOKEN;
    const userId = config.threadsUserId || process.env.THREADS_USER_ID;

    if (!accessToken) return { success: false, error: "Threads access token not configured" };
    if (!userId) return { success: false, error: "Threads user ID not configured" };

    const text = post.hashtags.length > 0
      ? `${post.content} ${post.hashtags.slice(0, 3).join(" ")}`
      : post.content;

    // Step 1: Create a media container
    const params = new URLSearchParams({
      media_type: post.mediaUrls.length > 0 ? "IMAGE" : "TEXT",
      text: text.slice(0, 500),
      access_token: accessToken,
    });

    if (post.mediaUrls.length > 0) {
      params.set("image_url", post.mediaUrls[0]);
    }

    const createRes = await fetch(
      `https://graph.threads.net/v1.0/${userId}/threads?${params}`,
      { method: "POST" },
    );

    if (!createRes.ok) {
      const error = await createRes.text();
      return { success: false, error: `Threads API error: ${error}` };
    }

    const container = await createRes.json();

    // Step 2: Publish the container
    const publishRes = await fetch(
      `https://graph.threads.net/v1.0/${userId}/threads_publish?creation_id=${container.id}&access_token=${accessToken}`,
      { method: "POST" },
    );

    if (!publishRes.ok) {
      const error = await publishRes.text();
      return { success: false, error: `Threads publish error: ${error}` };
    }

    const publishData = await publishRes.json();
    return { success: true, externalPostId: publishData.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
