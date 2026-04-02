import Link from "next/link";
import { getCommunityFeed, POST_CATEGORIES, type PostCategory } from "@/src/lib/community";
import { CommunityFeedClient, DealsCard, NeighborhoodSidebar } from "@/src/components/community";

// NavBar and Footer are provided by the shared (public) layout

/**
 * Public Community Page
 * Nextdoor-style neighborhood engagement hub
 */

type CommunityPageProps = {
  searchParams: Promise<{ category?: PostCategory; tag?: string }>;
};

const CommunityPage = async ({ searchParams }: CommunityPageProps) => {
  const params = await searchParams;
  const neighborhood = "Community";
  const feed = await getCommunityFeed(neighborhood, params.category);

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-accent to-brand-700 py-12 text-white">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-200">
                TriState Community
              </p>
              <h1 className="mt-2 text-3xl font-bold md:text-4xl">
                Neighborhood Hub
              </h1>
              <p className="mt-2 max-w-xl text-brand-100">
                Connect with neighbors, discover cleaning tips, and stay updated on local deals.
                Share your experiences and learn from the community.
              </p>
            </div>

            {/* Quick Stats - only show when there's real data */}
            {(feed.stats.totalMembers > 0 || feed.stats.postsThisMonth > 0) && (
              <div className="flex gap-4">
                <div className="rounded-2xl bg-white/10 px-5 py-3 backdrop-blur">
                  <p className="text-2xl font-bold">{feed.stats.totalMembers}</p>
                  <p className="text-xs text-brand-200">Members</p>
                </div>
                <div className="rounded-2xl bg-white/10 px-5 py-3 backdrop-blur">
                  <p className="text-2xl font-bold">{feed.stats.postsThisMonth}</p>
                  <p className="text-xs text-brand-200">Posts this month</p>
                </div>
                <div className="rounded-2xl bg-white/10 px-5 py-3 backdrop-blur">
                  <p className="text-2xl font-bold">{feed.stats.activeCleaners}</p>
                  <p className="text-xs text-brand-200">Local cleaners</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="border-b border-brand-100 bg-white">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-center gap-2 overflow-x-auto py-4">
            <Link
              href="/community"
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
                !params.category
                  ? "bg-brand-500 text-white"
                  : "bg-brand-50 text-brand-600 hover:bg-brand-100"
              }`}
            >
              All Posts
            </Link>
            {Object.entries(POST_CATEGORIES).map(([key, { label, icon }]) => (
              <Link
                key={key}
                href={`/community?category=${key}`}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
                  params.category === key
                    ? "bg-brand-500 text-white"
                    : "bg-brand-50 text-brand-600 hover:bg-brand-100"
                }`}
              >
                {icon} {label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Feed Column */}
          <div className="space-y-4 lg:col-span-2">
            {/* Create Post CTA */}
            <div className="rounded-2xl border border-brand-100 bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-semibold text-lg">
                  +
                </div>
                <Link
                  href="/community/new"
                  className="flex-1 rounded-full bg-brand-50 px-4 py-2.5 text-sm text-muted-foreground hover:bg-brand-100 transition"
                >
                  Share a tip, ask a question, or post a transformation...
                </Link>
              </div>
              <div className="mt-3 flex items-center gap-2 border-t border-brand-50 pt-3">
                <Link
                  href="/community/new"
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-brand-50"
                >
                  Cleaning Tip
                </Link>
                <Link
                  href="/community/new"
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-brand-50"
                >
                  Question
                </Link>
                <Link
                  href="/community/new"
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-brand-50"
                >
                  Before & After
                </Link>
              </div>
            </div>

            {/* Posts Feed */}
            {feed.posts.length === 0 ? (
              <div className="rounded-2xl border border-brand-100 bg-white p-8 text-center">
                <p className="mt-2 font-semibold text-accent">No posts yet</p>
                <p className="text-sm text-muted-foreground">
                  Community posts, cleaning tips, and local updates will appear here.
                  Check back soon for the latest from your neighborhood!
                </p>
              </div>
            ) : (
              <CommunityFeedClient seedPosts={feed.posts} />
            )}

            {/* Load More */}
            {feed.hasMore && (
              <button className="w-full rounded-xl border border-brand-200 bg-white py-3 text-sm font-semibold text-brand-600 transition hover:bg-brand-50">
                Load More Posts
              </button>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Deals Card */}
            <DealsCard deals={feed.deals} />

            {/* Neighborhood Sidebar */}
            <NeighborhoodSidebar
              stats={feed.stats}
              spotlight={feed.spotlights[0]}
            />
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="border-t border-brand-100 bg-brand-50 py-12">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-2xl font-bold text-accent">Join the TriState Community</h2>
          <p className="mt-2 text-muted-foreground">
            Get exclusive deals, share tips with neighbors, and connect with top-rated cleaners in your area.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/register"
              className="rounded-full bg-brand-500 px-8 py-3 text-sm font-semibold uppercase tracking-wider text-white transition hover:bg-brand-600"
            >
              Sign Up Free
            </Link>
            <Link
              href="/get-a-quote"
              className="rounded-full border border-brand-300 bg-white px-8 py-3 text-sm font-semibold uppercase tracking-wider text-brand-600 transition hover:bg-brand-50"
            >
              Get a Quote
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityPage;
