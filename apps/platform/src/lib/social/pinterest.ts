/**
 * Pinterest adapter.
 *
 * API: Pinterest API v5
 * Docs: https://developers.pinterest.com/docs/api/v5/
 *
 * Perfect for landscaping and construction content — Pinterest users
 * actively search for home improvement ideas with HIGH purchase intent.
 *
 * Required config:
 *   accessToken: string
 *   boardId: string (e.g., "123456789012345678")
 */
import { prisma } from "@/lib/prisma";
import type { SocialPost } from "@prisma/client";
import type { PublishResult } from "./types";

export async function publishToPinterest(post: SocialPost): Promise<PublishResult> {
  try {
    // Pinterest requires an image
    if (post.mediaUrls.length === 0) {
      return { success: false, error: "Pinterest requires an image" };
    }

    const integration = await prisma.integration.findFirst({
      where: { type: "SLACK", status: "ACTIVE" }, // placeholder
    });
    const config = (integration?.config as any) || {};

    const accessToken = config.pinterestAccessToken || process.env.PINTEREST_ACCESS_TOKEN;
    const boardId = config.pinterestBoardId || process.env.PINTEREST_BOARD_ID;

    if (!accessToken) return { success: false, error: "Pinterest access token not configured" };
    if (!boardId) return { success: false, error: "Pinterest board ID not configured" };

    const payload = {
      title: post.content.slice(0, 100),
      description: post.content.slice(0, 500),
      link: "https://tsenow.com",
      board_id: boardId,
      media_source: {
        source_type: "image_url",
        url: post.mediaUrls[0],
      },
      alt_text: post.content.slice(0, 500),
    };

    const res = await fetch("https://api.pinterest.com/v5/pins", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const error = await res.text();
      return { success: false, error: `Pinterest API error: ${error}` };
    }

    const data = await res.json();
    return { success: true, externalPostId: data.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
