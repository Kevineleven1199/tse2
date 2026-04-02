import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/src/lib/auth/session";

export const dynamic = "force-dynamic";

const BLOG_TOPICS = [
  { category: "Health & Safety", topics: [
    "Why organic cleaning products are safer for families with young children",
    "The hidden dangers of common household cleaning chemicals",
    "How indoor air quality improves after switching to organic cleaning",
    "Pet-safe cleaning: what every Kentucky pet owner needs to know",
    "Allergy season in Flatwoods: how organic cleaning reduces triggers",
  ]},
  { category: "Cleaning Tips", topics: [
    "The ultimate room-by-room spring cleaning checklist for Kentucky homes",
    "How to maintain a clean home between professional visits",
    "Bathroom deep cleaning secrets the pros use",
    "Kitchen hygiene: beyond the surface clean",
    "Dealing with Kentucky humidity: mold prevention tips",
  ]},
  { category: "Industry Secrets", topics: [
    "What to look for when hiring a cleaning company in Flatwoods",
    "Why the cheapest cleaning service often costs more in the long run",
    "Green-washing in the cleaning industry: how to spot fake organic claims",
    "How professional cleaners are trained vs untrained house cleaners",
    "The real cost of DIY cleaning vs professional service",
  ]},
  { category: "Flatwoods Living", topics: [
    "Preparing your Flatwoods home for snowbird season",
    "Hurricane prep cleaning checklist for Kentucky homeowners",
    "Best practices for vacation rental turnover cleaning in Russell",
    "Move-in cleaning guide for new Flatwoods residents",
    "Keeping your lanai and outdoor spaces spotless year-round",
  ]},
  { category: "Eco & Sustainability", topics: [
    "How switching to organic cleaning reduces your carbon footprint",
    "The environmental impact of cleaning product runoff in Kentucky waterways",
    "Sustainable cleaning tools that actually work",
    "Why EPA Safer Choice certified products matter for your home",
    "Building an eco-friendly cleaning routine from scratch",
  ]},
];

const generateSchema = z.object({
  topic: z.string().optional(),
  category: z.string().optional(),
});

/**
 * GET /api/admin/blog — list available blog topics for generation
 * POST /api/admin/blog — generate a blog post using AI
 */
export async function GET() {
  await requireSession({ roles: ["HQ"] });
  return NextResponse.json({ topics: BLOG_TOPICS });
}

export async function POST(request: Request) {
  const session = await requireSession({ roles: ["HQ"] });
  const body = await request.json();
  const { topic, category } = generateSchema.parse(body);

  // Pick topic: use provided, or random from category, or fully random
  let selectedTopic = topic;
  if (!selectedTopic) {
    const pool = category
      ? BLOG_TOPICS.find((c) => c.category === category)?.topics ?? []
      : BLOG_TOPICS.flatMap((c) => c.topics);
    selectedTopic = pool[Math.floor(Math.random() * pool.length)];
  }

  if (!selectedTopic) {
    return NextResponse.json({ error: "No topic selected" }, { status: 400 });
  }

  const selectedCategory = category || BLOG_TOPICS.find((c) => c.topics.includes(selectedTopic!))?.category || "Cleaning Tips";

  // Try AI providers in order: OpenAI → xAI → OpenRouter → Anthropic
  const providers: { name: string; key?: string; url?: string; model?: string }[] = [
    { name: "openai", key: process.env.OPENAI_API_KEY, url: "https://api.openai.com/v1/chat/completions", model: process.env.OPENAI_MODEL || "gpt-4o" },
    { name: "anthropic", key: process.env.ANTHROPIC_API_KEY },
    { name: "xai", key: process.env.XAI_API_KEY, url: "https://api.x.ai/v1/chat/completions", model: "grok-3-mini" },
    { name: "openrouter", key: process.env.OPENROUTER_API_KEY, url: "https://openrouter.ai/api/v1/chat/completions", model: "openai/gpt-4o" },
  ];

  // Also check Integration table for configured providers (overrides env vars)
  const integrations = await prisma.integration.findMany({
    where: { tenantId: session.tenantId, type: { in: ["OPENAI", "ANTHROPIC", "XAI", "OPENROUTER"] } },
    select: { type: true, config: true, status: true },
  });

  for (const int of integrations) {
    const cfg = int.config as Record<string, string>;
    if (cfg?.apiKey && cfg?.enabled !== "false") {
      const existing = providers.find((p) => p.name === int.type.toLowerCase());
      if (existing) {
        existing.key = cfg.apiKey;
        if (cfg.model) existing.model = cfg.model;
        if (cfg.baseUrl) existing.url = cfg.baseUrl.endsWith("/chat/completions") ? cfg.baseUrl : `${cfg.baseUrl}/chat/completions`;
      }
    }
  }

  const systemPrompt = `You are an expert content writer for Tri State Enterprise, an eco-friendly cleaning company in Flatwoods, Kentucky. Write SEO-optimized blog posts that:
- Are 800-1200 words long
- Use natural, conversational tone
- Include relevant keywords for local SEO (Flatwoods, Ashland, Tri-State Area, Kentucky)
- Have clear H2 and H3 headings using ## and ### markdown
- Include a compelling introduction and conclusion
- Add practical tips readers can use
- Mention Tri State Enterprise naturally (not salesy)
- End with a soft CTA to get a quote
- Are factually accurate about cleaning science and health

Return ONLY the blog post content in markdown format. No title (the topic IS the title). Start with the first paragraph.`;

  let content: string | null = null;
  let usedProvider = "none";

  // Try OpenAI-compatible providers
  for (const provider of providers) {
    if (!provider.key || provider.name === "anthropic") continue;
    try {
      const res = await fetch(provider.url!, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${provider.key}` },
        body: JSON.stringify({
          model: provider.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Write a blog post about: ${selectedTopic}` },
          ],
          max_tokens: 2000,
          temperature: 0.7,
        }),
        signal: AbortSignal.timeout(60000),
      });
      if (res.ok) {
        const data = await res.json();
        content = data.choices?.[0]?.message?.content;
        if (content) { usedProvider = provider.name; break; }
      }
    } catch { continue; }
  }

  // Try Anthropic if OpenAI-compatible failed
  if (!content) {
    const anthropicKey = providers.find((p) => p.name === "anthropic")?.key;
    if (anthropicKey) {
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 2000,
            system: systemPrompt,
            messages: [{ role: "user", content: `Write a blog post about: ${selectedTopic}` }],
          }),
          signal: AbortSignal.timeout(60000),
        });
        if (res.ok) {
          const data = await res.json();
          content = data.content?.[0]?.text;
          if (content) usedProvider = "anthropic";
        }
      } catch { /* continue */ }
    }
  }

  if (!content) {
    return NextResponse.json(
      { error: "No AI provider available. Configure an API key in Settings → API & Webhooks → AI Providers." },
      { status: 503 }
    );
  }

  // Generate slug from topic
  const baseSlug = selectedTopic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  // Ensure slug uniqueness
  const existingSlug = await prisma.blogPost.findUnique({ where: { slug: baseSlug } });
  const slug = existingSlug ? `${baseSlug}-${Date.now().toString(36)}` : baseSlug;

  // Generate excerpt (first 160 chars of content, stripped of markdown)
  const excerpt = content
    .replace(/#{1,3}\s/g, "")
    .replace(/\*\*/g, "")
    .replace(/\n/g, " ")
    .trim()
    .slice(0, 160) + "...";

  const wordCount = content.split(/\s+/).length;
  const readTime = Math.max(Math.ceil(wordCount / 200), 2);
  const autoPublish = body.publish === true;

  // Save to database
  const blogPost = await prisma.blogPost.create({
    data: {
      tenantId: session.tenantId,
      slug,
      title: selectedTopic,
      excerpt,
      content,
      category: selectedCategory,
      aiProvider: usedProvider,
      wordCount,
      readTime,
      metaDescription: excerpt.slice(0, 155),
      published: autoPublish,
      publishedAt: autoPublish ? new Date() : null,
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      actorId: session.userId,
      action: autoPublish ? "blog.published" : "blog.generated",
      metadata: { postId: blogPost.id, topic: selectedTopic, category: selectedCategory, provider: usedProvider, slug, wordCount },
    },
  });

  return NextResponse.json({
    success: true,
    post: {
      id: blogPost.id,
      title: selectedTopic,
      slug,
      excerpt,
      content,
      category: selectedCategory,
      provider: usedProvider,
      wordCount,
      readTime,
      published: autoPublish,
      generatedAt: blogPost.createdAt.toISOString(),
    },
  });
}
