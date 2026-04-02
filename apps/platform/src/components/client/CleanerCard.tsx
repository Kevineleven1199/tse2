"use client";

import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import type { CleanerInfo } from "@/src/lib/client-portal";

type CleanerCardProps = {
  cleaner: CleanerInfo | null;
};

export const CleanerCard = ({ cleaner }: CleanerCardProps) => {
  if (!cleaner) {
    return (
      <Card className="bg-white">
        <CardHeader className="pb-2">
          <h2 className="text-lg font-semibold text-accent">Your Cleaner</h2>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl bg-brand-50 p-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-3xl">
              👤
            </div>
            <p className="mt-3 font-semibold text-accent">Not yet assigned</p>
            <p className="mt-1 text-sm text-muted-foreground">
              We&apos;ll match you with a cleaner when you book your first visit
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white">
      <CardHeader className="pb-2">
        <h2 className="text-lg font-semibold text-accent">Your Cleaner</h2>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-4">
          {/* Photo */}
          <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl bg-brand-100">
            {cleaner.photoUrl ? (
              <Image 
                src={cleaner.photoUrl} 
                alt={cleaner.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl font-semibold text-brand-600">
                {cleaner.name.charAt(0)}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-accent">{cleaner.name}</h3>
            
            {/* Rating */}
            <div className="mt-1 flex items-center gap-2">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span 
                    key={star} 
                    className={star <= Math.round(cleaner.rating) ? "text-sunshine" : "text-gray-200"}
                  >
                    ★
                  </span>
                ))}
              </div>
              <span className="text-sm font-medium text-accent">{cleaner.rating.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">({cleaner.totalCleans} cleans)</span>
            </div>

            {/* Bio */}
            {cleaner.bio && (
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                {cleaner.bio}
              </p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-4 flex gap-2">
          <Link
            href="/client/feedback"
            className="flex-1 rounded-full border border-brand-200 px-4 py-2 text-center text-sm font-medium text-accent transition hover:bg-brand-50"
          >
            Leave Review
          </Link>
          <Link
            href={`/client/cleaner/${cleaner.id}`}
            className="flex-1 rounded-full bg-brand-100 px-4 py-2 text-center text-sm font-medium text-accent transition hover:bg-brand-200"
          >
            View Profile
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-brand-50 p-3">
          <div className="text-center">
            <p className="text-lg font-bold text-accent">{cleaner.totalCleans}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Cleans</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-accent">{cleaner.rating.toFixed(1)}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Rating</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
