/**
 * AI-powered social media content generator.
 * Creates platform-specific posts from blog content or topics.
 */
import type { SocialPlatform } from "@prisma/client";
import type { ContentVariant } from "./types";

const PLATFORM_PROMPTS: Record<string, string> = {
  FACEBOOK: `Write a Facebook post for a construction/HVAC/landscaping company called Tri State Enterprise in the KY-OH-WV Tri-State area.
- 200-400 characters
- Conversational and friendly tone
- Include a call to action (call, visit website, or get a free estimate)
- Don't use hashtags in the main text
- End with: "Call (606) 836-2534 | tsenow.com"`,

  INSTAGRAM: `Write an Instagram caption for a construction/HVAC/landscaping company called Tri State Enterprise.
- 150-300 characters for the main caption
- Visual and engaging language
- Include emojis naturally
- End with a line break then relevant hashtags (max 15)
- Focus on: #TriStateEnterprise #Construction #HVAC #Landscaping #KentuckyContractor #OneCallDoesItAll`,

  TWITTER_X: `Write a tweet for a construction/HVAC/landscaping company called Tri State Enterprise.
- MUST be under 280 characters total including hashtags
- Punchy and direct
- Include 2-3 hashtags max
- If including a link placeholder use [LINK]`,

  TIKTOK: `Write a TikTok caption for a construction/HVAC/landscaping video.
- Under 150 characters
- Casual, trendy tone
- Include 3-5 relevant hashtags`,
};

const SEASONAL_TOPICS = [
  "Spring is the perfect time for landscaping projects — call us for a free estimate!",
  "Is your HVAC system ready for summer? Schedule your AC maintenance now.",
  "Fall lawn care tip: Aeration and overseeding now means a beautiful lawn in spring.",
  "Winter is coming — make sure your furnace is ready. Free HVAC inspections available.",
  "New construction project? We've been building in the Tri-State area since 1992.",
  "Driveway looking rough? Our paving team can have it looking new in a day.",
  "Thinking about a home renovation? Free estimates on all construction projects.",
  "Your lawn deserves professional care. Weekly mowing plans starting at affordable rates.",
  "Retaining walls add beauty AND value to your property. Ask us about our hardscaping services.",
  "HVAC emergency? We offer fast response times across KY, OH, and WV.",
];

/**
 * Generate platform-specific social media content from a blog post.
 */
export async function generateFromBlog(
  blogTitle: string,
  blogExcerpt: string,
  blogSlug: string,
  platforms: SocialPlatform[] = ["FACEBOOK", "INSTAGRAM", "TWITTER_X"],
): Promise<ContentVariant[]> {
  const variants: ContentVariant[] = [];

  for (const platform of platforms) {
    const prompt = PLATFORM_PROMPTS[platform];
    if (!prompt) continue;

    const fullPrompt = `${prompt}\n\nBlog post to promote:\nTitle: "${blogTitle}"\nSummary: ${blogExcerpt}\nLink: https://tsenow.com/blog/${blogSlug}\n\nWrite ONLY the social media post text. No explanations.`;

    try {
      const content = await callAI(fullPrompt);
      const hashtags = extractHashtags(content);
      variants.push({ platform, content: content.replace(/#\w+/g, "").trim(), hashtags });
    } catch {
      // Fallback: use blog excerpt directly
      const fallback = platform === "TWITTER_X"
        ? `${blogTitle.slice(0, 200)} \uD83D\uDC49 tsenow.com/blog/${blogSlug} #TriStateEnterprise`
        : `${blogExcerpt}\n\nRead more: tsenow.com/blog/${blogSlug}\n\nCall (606) 836-2534 | tsenow.com`;
      variants.push({ platform, content: fallback, hashtags: ["#TriStateEnterprise"] });
    }
  }

  return variants;
}

/**
 * Generate a standalone social post from a topic or seasonal tip.
 */
export async function generateFromTopic(
  topic: string,
  platform: SocialPlatform,
): Promise<ContentVariant> {
  const prompt = PLATFORM_PROMPTS[platform];
  if (!prompt) {
    return { platform, content: topic, hashtags: [] };
  }

  try {
    const content = await callAI(`${prompt}\n\nTopic: ${topic}\n\nWrite ONLY the post text.`);
    return { platform, content, hashtags: extractHashtags(content) };
  } catch {
    return { platform, content: topic, hashtags: ["#TriStateEnterprise"] };
  }
}

/**
 * Get a random seasonal topic for auto-posting.
 */
export function getSeasonalTopic(): string {
  const month = new Date().getMonth();
  // Weight topics by season
  const seasonalIndices = month >= 2 && month <= 4 ? [0, 6, 7, 8] // spring
    : month >= 5 && month <= 7 ? [1, 5, 7, 9] // summer
    : month >= 8 && month <= 10 ? [2, 6, 8, 4] // fall
    : [3, 4, 9, 6]; // winter
  const idx = seasonalIndices[Math.floor(Math.random() * seasonalIndices.length)];
  return SEASONAL_TOPICS[idx];
}

function extractHashtags(text: string): string[] {
  return (text.match(/#\w+/g) || []).slice(0, 15);
}

async function callAI(prompt: string): Promise<string> {
  // Try providers in order: OpenAI → xAI → OpenRouter
  const providers = [
    { key: "OPENAI_API_KEY", url: "https://api.openai.com/v1/chat/completions", model: "gpt-4o-mini" },
    { key: "XAI_API_KEY", url: "https://api.x.ai/v1/chat/completions", model: "grok-3-mini" },
    { key: "OPENROUTER_API_KEY", url: "https://openrouter.ai/api/v1/chat/completions", model: "meta-llama/llama-3.3-70b-instruct" },
  ];

  for (const provider of providers) {
    const apiKey = process.env[provider.key];
    if (!apiKey) continue;

    const res = await fetch(provider.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: provider.model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
        temperature: 0.8,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return data.choices?.[0]?.message?.content?.trim() || "";
    }
  }

  throw new Error("No AI provider available");
}
