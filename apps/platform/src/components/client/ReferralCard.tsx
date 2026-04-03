"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { formatCurrency } from "@/src/lib/utils";

type ReferralCardProps = {
  referralCode: string;
  referralCount: number;
  referralCredits: number;
};

export const ReferralCard = ({ referralCode, referralCount, referralCredits }: ReferralCardProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://tsenow.com";
  const shareUrl = `${baseUrl}/get-a-quote?ref=${referralCode}`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Get $25 off your first eco-clean!",
          text: "I love Tri State Enterprise! Use my code to get $25 off your first project.",
          url: shareUrl
        });
      } catch (err) {
        // User cancelled or share failed
        // User cancelled share dialog — no action needed
      }
    } else {
      handleCopy();
    }
  };

  return (
    <Card className="bg-white">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-accent">Refer & Earn</h2>
          {referralCredits > 0 && (
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
              {formatCurrency(referralCredits)} credit
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Value Proposition */}
        <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 p-4 text-white">
          <p className="text-lg font-bold">Give $25, Get $25</p>
          <p className="mt-1 text-sm opacity-90">
            Share your code with friends. They get $25 off their first clean, you get $25 credit!
          </p>
        </div>

        {/* Referral Code */}
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Your referral code</p>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 rounded-xl border-2 border-dashed border-brand-200 bg-brand-50 px-4 py-3 text-center">
              <span className="font-mono text-lg font-bold tracking-wider text-accent">{referralCode}</span>
            </div>
            <button
              onClick={handleCopy}
              className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                copied 
                  ? "bg-green-100 text-green-700" 
                  : "bg-brand-100 text-accent hover:bg-brand-200"
              }`}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        {/* Share Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            <span>📤</span> Share Link
          </button>
          <a
            href={`mailto:?subject=Get $25 off your next project!&body=I love Tri State Enterprise! Use my referral code ${referralCode} to get $25 off your first project. Book here: ${shareUrl}`}
            className="flex items-center justify-center gap-2 rounded-xl border border-brand-200 px-4 py-3 text-sm font-semibold text-accent transition hover:bg-brand-50"
          >
            <span>✉️</span> Email
          </a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 rounded-2xl bg-brand-50 p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-accent">{referralCount}</p>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Friends Referred</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{formatCurrency(referralCredits)}</p>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Credits Earned</p>
          </div>
        </div>

        {/* How it works */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">How it works</p>
          <ol className="space-y-1 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-accent">1</span>
              <span>Share your code with friends</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-accent">2</span>
              <span>They book their first clean with $25 off</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-accent">3</span>
              <span>You get $25 credit after their clean</span>
            </li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};
