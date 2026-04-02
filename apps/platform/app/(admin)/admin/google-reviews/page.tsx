import { requireSession } from "@/src/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import ReviewsClient from "./reviews-client";

export default async function GoogleReviewsPage() {
  await requireSession({ roles: ["HQ"], redirectTo: "/login" });

  try {
    const reviews = await prisma.googleReview.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    const totalReviews = reviews.length;
    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

    const sentimentCounts = reviews.reduce(
      (acc, r) => {
        const sentiment = r.sentiment || "neutral";
        acc[sentiment] = (acc[sentiment] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Serialize dates and rename authorName to author
    const serializedReviews = reviews.map((review) => ({
      id: review.id,
      author: review.authorName,
      text: review.text,
      rating: review.rating,
      sentiment: review.sentiment,
      publishedAt: review.publishedAt.toISOString(),
      replyText: review.replyText,
      repliedAt: review.repliedAt?.toISOString() || null,
      customerEmail: review.customerEmail,
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
    }));

    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 p-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-200">
            REPUTATION MANAGEMENT
          </p>
          <h1 className="text-2xl font-semibold">Google Reviews</h1>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <p className="text-sm text-muted-foreground">Avg Rating</p>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{avgRating.toFixed(1)}/5</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <p className="text-sm text-muted-foreground">Total Reviews</p>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totalReviews}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <p className="text-sm text-muted-foreground">Positive</p>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {sentimentCounts["positive"] || 0}
              </p>
            </CardContent>
          </Card>
        </div>

        <ReviewsClient initialData={serializedReviews} />
      </div>
    );
  } catch (error) {
    console.error("Failed to load Google Reviews:", error);
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Google Reviews</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Failed to load data. Please try refreshing the page.
        </div>
      </div>
    );
  }
}
