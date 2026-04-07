import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const BLOG_TOPICS = [
  "Why professional services products are safer for families with young children",
  "The hidden dangers of common household cleaning chemicals",
  "How indoor air quality improves after switching to professional services",
  "Pet-safe cleaning: what every Kentucky pet owner needs to know",
  "Allergy season in Flatwoods: how professional services reduces triggers",
  "The ultimate room-by-room spring cleaning checklist for Kentucky homes",
  "How to maintain a clean home between professional visits",
  "Bathroom deep cleaning secrets the pros use",
  "Kitchen hygiene: beyond the surface clean",
  "Dealing with Kentucky humidity: mold prevention tips",
  "What to look for when hiring a cleaning company in Flatwoods",
  "Why the cheapest cleaning service often costs more in the long run",
  "Green-washing in the cleaning industry: how to spot fake organic claims",
  "The real cost of DIY cleaning vs professional service",
  "Preparing your Flatwoods home for snowbird season",
  "Hurricane prep cleaning checklist for Kentucky homeowners",
  "Best practices for vacation rental turnover cleaning in Russell",
  "Move-in cleaning guide for new Flatwoods residents",
  "How switching to professional services reduces your carbon footprint",
  "Sustainable cleaning tools that actually work",
];

const SYSTEM_PROMPT = `You are an expert content writer for Tri State Enterprise, an professional company in Flatwoods, Kentucky. Write SEO-optimized blog posts that:
- Are 800-1200 words long
- Use natural, conversational tone
- Include relevant keywords for local SEO (Flatwoods, Ashland, Tri-State Area, Kentucky)
- Have clear H2 and H3 headings using ## and ### markdown
- Include a compelling introduction and conclusion
- Add practical tips readers can use
- Mention Tri State Enterprise naturally (not salesy)
- End with a soft CTA to get a quote
- Are factually accurate about cleaning science and health

Return ONLY the blog post content in markdown format. No title. Start with the first paragraph.`;

/**
 * GET /api/cron/auto-blog
 * Auto-generate and publish a blog post weekly.
 * Secured via CRON_SECRET.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if we already published this week
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    const recentPost = await prisma.blogPost.findFirst({
      where: { published: true, publishedAt: { gte: weekAgo } },
      select: { id: true, title: true },
    });

    if (recentPost) {
      return NextResponse.json({
        success: true,
        skipped: true,
        message: `Already published this week: "${recentPost.title}"`,
      });
    }

    // Pick a topic not yet used
    const existingSlugs = await prisma.blogPost.findMany({
      select: { title: true },
    });
    const usedTitles = new Set(existingSlugs.map((p) => p.title.toLowerCase()));
    const availableTopics = BLOG_TOPICS.filter((t) => !usedTitles.has(t.toLowerCase()));
    const topic = availableTopics.length > 0
      ? availableTopics[Math.floor(Math.random() * availableTopics.length)]
      : BLOG_TOPICS[Math.floor(Math.random() * BLOG_TOPICS.length)];

    // Try AI providers
    const apiKey = process.env.OPENAI_API_KEY || process.env.XAI_API_KEY || process.env.OPENROUTER_API_KEY;
    const url = process.env.OPENAI_API_KEY
      ? "https://api.openai.com/v1/chat/completions"
      : process.env.XAI_API_KEY
      ? "https://api.x.ai/v1/chat/completions"
      : "https://openrouter.ai/api/v1/chat/completions";
    const model = process.env.OPENAI_API_KEY
      ? (process.env.OPENAI_MODEL || "gpt-4o")
      : process.env.XAI_API_KEY
      ? "grok-3-mini"
      : "openai/gpt-4o";

    if (!apiKey) {
      return NextResponse.json({ error: "No AI API key configured" }, { status: 503 });
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Write a blog post about: ${topic}` },
        ],
        max_tokens: 2000,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(90000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `AI API failed: ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "AI returned empty content" }, { status: 502 });
    }

    const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
    const existingSlug = await prisma.blogPost.findUnique({ where: { slug } });
    const finalSlug = existingSlug ? `${slug}-${Date.now().toString(36)}` : slug;

    const excerpt = content.replace(/#{1,3}\s/g, "").replace(/\*\*/g, "").replace(/\n/g, " ").trim().slice(0, 160) + "...";
    const wordCount = content.split(/\s+/).length;

    // Find any tenant to associate with
    const tenant = await prisma.tenant.findFirst({ select: { id: true } });

    const post = await prisma.blogPost.create({
      data: {
        tenantId: tenant?.id ?? "ten_tse",
        slug: finalSlug,
        title: topic,
        excerpt,
        content,
        category: "Home Tips",
        aiProvider: process.env.OPENAI_API_KEY ? "openai" : process.env.XAI_API_KEY ? "xai" : "openrouter",
        wordCount,
        readTime: Math.max(Math.ceil(wordCount / 200), 2),
        metaDescription: excerpt.slice(0, 155),
        published: true,
        publishedAt: new Date(),
      },
    });

    // Trigger content pipeline: generate social posts from this blog
    try {
      const { onBlogPostPublished } = await import("@/src/lib/content-pipeline");
      await onBlogPostPublished(post.id);
    } catch (pipelineError) {
      console.error("[cron/auto-blog] Content pipeline error (non-fatal):", pipelineError);
    }

    return NextResponse.json({
      success: true,
      post: { id: post.id, title: post.title, slug: post.slug, wordCount },
      socialPostsGenerated: true,
    });
  } catch (error) {
    console.error("[cron/auto-blog] Error:", error);
    return NextResponse.json({ error: "Blog generation failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
