"use client";

import { Card, CardContent } from "@/src/components/ui/card";

interface ReviewData {
  id: string;
  author: string;
  text: string | null;
  rating: number;
  sentiment: string | null;
  publishedAt: string;
  replyText: string | null;
  repliedAt: string | null;
  customerEmail: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function ReviewsClient({
  initialData,
}: {
  initialData: ReviewData[];
}) {
  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <span
        key={i}
        className={i < rating ? "text-yellow-400" : "text-gray-300"}
      >
        ★
      </span>
    ));
  };

  const getSentimentColor = (sentiment: string | null) => {
    switch (sentiment) {
      case "positive":
        return "bg-green-100 text-green-800";
      case "negative":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-4">
      {initialData.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          No reviews yet.
        </p>
      ) : (
        <div className="grid gap-4">
          {initialData.map((review) => (
            <Card key={review.id}>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold">{review.author}</h4>
                      <div className="flex gap-1 mt-1">
                        {renderStars(review.rating)}
                      </div>
                    </div>
                    {review.sentiment && (
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getSentimentColor(
                          review.sentiment
                        )}`}
                      >
                        {review.sentiment.charAt(0).toUpperCase() +
                          review.sentiment.slice(1)}
                      </span>
                    )}
                  </div>
                  {review.text && (
                    <p className="text-sm text-muted-foreground">{review.text}</p>
                  )}
                  {review.replyText && (
                    <div className="bg-gray-50 p-3 rounded border-l-2 border-brand-600">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">
                        Reply:
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {review.replyText}
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date(review.publishedAt).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
