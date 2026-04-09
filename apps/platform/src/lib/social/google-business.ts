/**
 * Google Business Profile adapter.
 *
 * CRITICAL for local SEO — GBP posts directly affect Google Maps rankings
 * and the local pack. Post 2-3x per week minimum.
 *
 * API: Google My Business Business Profile API v4
 * Docs: https://developers.google.com/my-business/reference/rest/v4/accounts.locations.localPosts
 *
 * Auth: OAuth 2.0 with scope:
 *   https://www.googleapis.com/auth/business.manage
 *
 * Required config in Integration.config:
 *   accessToken: string (refreshed via refreshToken)
 *   refreshToken: string
 *   clientId: string
 *   clientSecret: string
 *   accountId: string (e.g., "accounts/1234567890")
 *   locationId: string (e.g., "locations/9876543210")
 */
import { prisma } from "@/lib/prisma";
import type { SocialPost } from "@prisma/client";
import type { PublishResult } from "./types";

const GBP_API_BASE = "https://mybusiness.googleapis.com/v4";

export async function publishToGoogleBusiness(post: SocialPost): Promise<PublishResult> {
  try {
    const integration = await prisma.integration.findFirst({
      where: { type: "GOOGLE_DRIVE", status: "ACTIVE" }, // GBP uses same Google OAuth
    });
    const config = (integration?.config as any) || {};

    const accessToken = await getValidAccessToken(config);
    if (!accessToken) return { success: false, error: "Google Business Profile not authenticated" };

    const accountId = config.gbpAccountId || process.env.GBP_ACCOUNT_ID;
    const locationId = config.gbpLocationId || process.env.GBP_LOCATION_ID;
    if (!accountId || !locationId) {
      return { success: false, error: "Google Business Profile account/location not configured" };
    }

    // Build the local post payload
    const payload: any = {
      languageCode: "en-US",
      summary: post.content.slice(0, 1500),
      topicType: "STANDARD",
      callToAction: {
        actionType: "CALL",
        url: "tel:+16068362534",
      },
    };

    // Add media if available
    if (post.mediaUrls.length > 0) {
      payload.media = post.mediaUrls.slice(0, 1).map((url) => ({
        mediaFormat: "PHOTO",
        sourceUrl: url,
      }));
    }

    const endpoint = `${GBP_API_BASE}/${accountId}/${locationId}/localPosts`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const error = await res.text();
      return { success: false, error: `GBP API error: ${error}` };
    }

    const data = await res.json();
    return { success: true, externalPostId: data.name };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Refresh the access token using the refresh token if needed.
 * Google access tokens expire every 60 minutes.
 */
async function getValidAccessToken(config: any): Promise<string | null> {
  const now = Date.now();
  const expiresAt = config.accessTokenExpiresAt || 0;

  // Still valid
  if (config.accessToken && expiresAt > now + 60000) {
    return config.accessToken;
  }

  // Need to refresh
  if (!config.refreshToken || !config.clientId || !config.clientSecret) {
    return process.env.GBP_ACCESS_TOKEN || null;
  }

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: config.refreshToken,
        client_id: config.clientId,
        client_secret: config.clientSecret,
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    // In production, you'd want to update the Integration record with new token
    return data.access_token;
  } catch {
    return null;
  }
}

/**
 * Fetch the user's GBP accounts and locations (for setup/onboarding).
 */
export async function listGbpLocations(accessToken: string) {
  const accountsRes = await fetch(`${GBP_API_BASE}/accounts`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const accounts = await accountsRes.json();

  const locations = [];
  for (const account of accounts.accounts || []) {
    const locRes = await fetch(`${GBP_API_BASE}/${account.name}/locations`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const locData = await locRes.json();
    locations.push(...(locData.locations || []).map((loc: any) => ({
      accountName: account.name,
      locationName: loc.name,
      title: loc.title || loc.locationName,
      address: loc.storefrontAddress,
    })));
  }

  return locations;
}
