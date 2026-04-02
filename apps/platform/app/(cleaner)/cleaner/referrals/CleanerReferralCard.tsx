"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";

type CleanerReferralCardProps = {
  referralCode: string;
  referralCount: number;
  referralCredits: number;
  pendingCount: number;
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

export const CleanerReferralCard = ({
  referralCode,
  referralCount,
  referralCredits,
  pendingCount
}: CleanerReferralCardProps) => {
  const [copied, setCopied] = useState(false);
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://tsenow.com";
  const shareUrl = `${baseUrl}/get-a-quote?ref=${referralCode}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Get $25 off your first eco-clean!",
          text: "I work with Tri State Enterpriseing! Use my code to get $25 off your first clean.",
          url: shareUrl
        });
      } catch {
        // User cancelled share dialog
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
              {formatCurrency(referralCredits)} earned
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Value Proposition */}
        <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 p-4 text-white">
          <p className="text-lg font-bold">Give $25, Get $25</p>
          <p className="mt-1 text-sm opacity-90">
            Share your code with potential customers. They get $25 off their first clean, you earn $25 credit!
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

        {/* Share Link */}
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Share link</p>
          <p className="mt-1 truncate rounded-lg bg-gray-50 px-3 py-2 font-mono text-xs text-muted-foreground">
            {shareUrl}
          </p>
        </div>

        {/* Share Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Share Link
          </button>
          <a
            href={`sms:?body=I work with Tri State Enterpriseing! Use my referral code ${referralCode} to get $25 off your first eco-friendly clean. Book here: ${shareUrl}`}
            className="flex items-center justify-center gap-2 rounded-xl border border-brand-200 px-4 py-3 text-sm font-semibold text-accent transition hover:bg-brand-50"
          >
            Text a Friend
          </a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 rounded-2xl bg-brand-50 p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-accent">{referralCount}</p>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Referred</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Pending</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{formatCurrency(referralCredits)}</p>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Earned</p>
          </div>
        </div>

        {/* How it works */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">How it works</p>
          <ol className="space-y-1 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-accent">1</span>
              <span>Share your code or link with friends and clients</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-accent">2</span>
              <span>They book their first clean and get $25 off</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-accent">3</span>
              <span>You earn $25 credit after their clean is completed</span>
            </li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};
