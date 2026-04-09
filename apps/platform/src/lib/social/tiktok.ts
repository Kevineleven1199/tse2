/**
 * TikTok Content Posting adapter.
 *
 * API: TikTok Content Posting API
 * Docs: https://developers.tiktok.com/doc/content-posting-api-get-started
 *
 * Required config:
 *   accessToken: string (OAuth 2.0 with video.publish scope)
 */
import { prisma } from "@/lib/prisma";
import type { SocialPost } from "@prisma/client";
import type { PublishResult } from "./types";

export async function publishToTiktok(post: SocialPost): Promise<PublishResult> {
  try {
    if (post.mediaUrls.length === 0) {
      return { success: false, error: "TikTok requires a video" };
    }

    const integration = await prisma.integration.findFirst({
      where: { type: "TIKTOK", status: "ACTIVE" },
    });
    const config = (integration?.config as any) || {};
    const accessToken = config.accessToken || process.env.TIKTOK_ACCESS_TOKEN;

    if (!accessToken) return { success: false, error: "TikTok access token not configured" };

    const caption = post.hashtags.length > 0
      ? `${post.content} ${post.hashtags.slice(0, 5).join(" ")}`
      : post.content;

    // TikTok uses a two-step process:
    // 1. Initialize upload → get upload URL
    // 2. Upload video to URL

    const initRes = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        post_info: {
          title: caption.slice(0, 150),
          privacy_level: "PUBLIC_TO_EVERYONE",
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
        },
        source_info: {
          source: "PULL_FROM_URL",
          video_url: post.mediaUrls[0],
        },
      }),
    });

    if (!initRes.ok) {
      const error = await initRes.text();
      return { success: false, error: `TikTok API error: ${error}` };
    }

    const data = await initRes.json();
    return {
      success: true,
      externalPostId: data.data?.publish_id,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
