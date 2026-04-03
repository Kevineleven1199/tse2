"use client";

// Community feed — displays real posts from the database only.
// Do NOT add hardcoded fake posts, fake names, or fake engagement numbers.

const CommunityFeed = () => (
  <section className="glass space-y-4 rounded-3xl p-6 text-white">
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/70">
      <p className="font-semibold text-white">Neighborhood Hub</p>
      <p className="mt-2">
        Community posts, cleaning tips, and local updates will appear here.
        Check back soon for the latest from your neighborhood!
      </p>
    </div>
    <div className="rounded-3xl border border-dashed border-white/20 p-6 text-center text-sm text-white/60">
      <p className="font-semibold text-white">Share with your neighbors</p>
      <p className="mt-2">
        Post cleaning tips, professional recommendations, and connect
        with your local Tri State community.
      </p>
      <button className="mt-4 rounded-full border border-white/30 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white/70 hover:border-white hover:text-white">
        Coming Soon
      </button>
    </div>
  </section>
);

export default CommunityFeed;
