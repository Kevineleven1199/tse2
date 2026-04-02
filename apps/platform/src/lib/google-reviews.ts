/**
 * Google Reviews Integration
 * Fetches Google reviews and syncs sentiment analysis
 */

import { prisma } from "@/lib/prisma";

export interface GoogleReviewData {
  reviewId: string;
  authorName: string;
  rating: number;
  text?: string;
  publishedAt: Date;
  replyText?: string;
  repliedAt?: Date;
  customerEmail?: string;
}

/**
 * Fetch Google reviews from Places API with retry logic and timeout
 */
export async function fetchGoogleReviews(placeId: string, maxRetries: number = 3): Promise<GoogleReviewData[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    console.error("GOOGLE_PLACES_API_KEY not configured");
    return [];
  }

  if (!placeId || typeof placeId !== "string") {
    console.error("Invalid placeId provided");
    return [];
  }

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews&key=${apiKey}`,
        { signal: controller.signal }
      );

      clearTimeout(timeout);

      if (!response.ok) {
        // Don't retry on 4xx errors, only on 5xx or network errors
        if (response.status >= 500) {
          console.warn(`Google Places API error (attempt ${attempt + 1}/${maxRetries}): ${response.statusText}`);
          if (attempt < maxRetries - 1) {
            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            continue;
          }
        }
        console.error(`Google Places API error: ${response.statusText}`);
        return [];
      }

      let data;
      try {
        data = await response.json();
      } catch (parseErr) {
        console.error("Failed to parse Google Places API response:", parseErr);
        return [];
      }

      if (!data.result?.reviews) {
        return [];
      }

      return data.result.reviews.map((review: any) => ({
        reviewId: `${placeId}_${review.time}`,
        authorName: review.author_name || "Anonymous",
        rating: typeof review.rating === "number" && review.rating >= 1 && review.rating <= 5 ? review.rating : 3,
        text: review.text,
        publishedAt: typeof review.time === "number" ? new Date(review.time * 1000) : new Date(),
        customerEmail: undefined // Google API doesn't provide email
      }));
    } catch (err) {
      if (err instanceof TypeError && err.message === "Failed to fetch") {
        // Network error, retry
        console.warn(`Network error fetching Google reviews (attempt ${attempt + 1}/${maxRetries}):`, err);
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          continue;
        }
      }
      console.error("Failed to fetch Google reviews:", err);
      return [];
    }
  }

  return [];
}

/**
 * Analyze sentiment based on rating and text
 */
function analyzeSentiment(rating: number, text?: string): "positive" | "neutral" | "negative" {
  if (rating >= 4) return "positive";
  if (rating === 3) return "neutral";
  return "negative";
}

/**
 * Sync Google reviews to database
 */
export async function syncGoogleReviews(tenantId: string, placeId: string) {
  try {
    const reviews = await fetchGoogleReviews(placeId);
    let syncedCount = 0;
    let updatedCount = 0;

    for (const review of reviews) {
      const sentiment = analyzeSentiment(review.rating, review.text);

      const existing = await prisma.googleReview.findUnique({
        where: { reviewId: review.reviewId }
      });

      if (existing) {
        // Update existing review
        await prisma.googleReview.update({
          where: { reviewId: review.reviewId },
          data: {
            replyText: review.replyText,
            repliedAt: review.repliedAt,
            sentiment,
            updatedAt: new Date()
          }
        });
        updatedCount++;
      } else {
        // Create new review
        await prisma.googleReview.create({
          data: {
            tenantId,
            reviewId: review.reviewId,
            authorName: review.authorName,
            rating: review.rating,
            text: review.text,
            publishedAt: review.publishedAt,
            sentiment
          }
        });
        syncedCount++;
      }
    }

    console.log(`Synced ${syncedCount} new reviews, updated ${updatedCount} existing reviews`);
    return { syncedCount, updatedCount, totalReviews: reviews.length };
  } catch (err) {
    console.error(`Failed to sync Google reviews for tenant ${tenantId}:`, err);
    throw err;
  }
}

/**
 * Get review statistics
 */
export async function getReviewStats(tenantId: string) {
  const reviews = await prisma.googleReview.findMany({
    where: { tenantId }
  });

  if (reviews.length === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      sentimentBreakdown: {
        positive: 0,
        neutral: 0,
        negative: 0
      },
      responseRate: 0
    };
  }

  const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  
  const ratingDistribution = {
    5: reviews.filter(r => r.rating === 5).length,
    4: reviews.filter(r => r.rating === 4).length,
    3: reviews.filter(r => r.rating === 3).length,
    2: reviews.filter(r => r.rating === 2).length,
    1: reviews.filter(r => r.rating === 1).length
  };

  const sentimentBreakdown = {
    positive: reviews.filter(r => r.sentiment === "positive").length,
    neutral: reviews.filter(r => r.sentiment === "neutral").length,
    negative: reviews.filter(r => r.sentiment === "negative").length
  };

  const repliedCount = reviews.filter(r => r.repliedAt).length;
  const responseRate = (repliedCount / reviews.length) * 100;

  return {
    averageRating: Math.round(averageRating * 10) / 10,
    totalReviews: reviews.length,
    ratingDistribution,
    sentimentBreakdown,
    responseRate: Math.round(responseRate)
  };
}

/**
 * Get recent reviews with sentiment
 */
export async function getRecentReviews(tenantId: string, limit: number = 10) {
  return await prisma.googleReview.findMany({
    where: { tenantId },
    orderBy: { publishedAt: "desc" },
    take: limit
  });
}
