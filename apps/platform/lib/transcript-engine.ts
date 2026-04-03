import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calculateQuote, type QuoteInput } from "@/src/lib/pricing";
import { sendOperationalSms } from "@/src/lib/notifications";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AI Provider Cascade: Ollama (FREE) → OpenRouter → OpenAI (paid)
// Ollama runs locally on your machine = $0 per transcript forever
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "mistral-nemo";

type DialogueEntry = {
  start: number;
  end: number;
  content: string;
  identifier: string;
  userId?: string;
};

type TranscriptAnalysis = {
  summary: string;
  customerName: string | null;
  propertyAddress: string | null;
  sqft: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  serviceType: "healthy_home" | "deep_refresh" | "move_in_out" | "commercial" | null;
  frequency: "one_time" | "weekly" | "biweekly" | "monthly";
  locationTier: "sarasota" | "manatee" | "pinellas" | "hillsborough" | "pasco" | "out_of_area";
  addOns: string[];
  sentiment: "positive" | "neutral" | "negative";
  followUpNeeded: boolean;
  keyDetails: string;
};

const TRANSCRIPT_SYSTEM_PROMPT = `You are an AI assistant for Tri State Enterprise, a residential/commercial professional company in the Flatwoods, KY area.

Analyze this phone call transcript and extract:
1. A concise 2-3 sentence summary of the call
2. Customer details (name, address, square footage, bedrooms, bathrooms)
3. What service they're interested in (healthy_home, deep_refresh, move_in_out, or commercial)
4. Preferred frequency (one_time, weekly, biweekly, or monthly)
5. Location tier based on area mentioned (sarasota, manatee, pinellas, hillsborough, pasco, or out_of_area)
6. Any add-on services mentioned (inside_appliances, interior_windows, pressure_washing, car_detailing, laundry_organization, eco_disinfection)
7. Customer sentiment (positive, neutral, or negative)
8. Whether follow-up is needed
9. Key details or special requests

Respond ONLY with valid JSON matching this exact schema:
{
  "summary": "string",
  "customerName": "string or null",
  "propertyAddress": "string or null",
  "sqft": "number or null",
  "bedrooms": "number or null",
  "bathrooms": "number or null",
  "serviceType": "healthy_home|deep_refresh|move_in_out|commercial or null",
  "frequency": "one_time|weekly|biweekly|monthly",
  "locationTier": "sarasota|manatee|pinellas|hillsborough|pasco|out_of_area",
  "addOns": ["array of add-on keys"],
  "sentiment": "positive|neutral|negative",
  "followUpNeeded": true/false,
  "keyDetails": "string with any special notes"
}

If information is not mentioned in the call, use null for optional fields and reasonable defaults for required fields.`;

/**
 * Call Ollama (local, FREE) with OpenAI-compatible API
 */
async function callOllamaJSON(systemPrompt: string, userMessage: string): Promise<string | null> {
  try {
    const resp = await fetch(`${OLLAMA_URL}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(60000), // 60s timeout for longer transcripts
    });

    if (!resp.ok) return null;

    const data = await resp.json() as { choices: Array<{ message: { content: string } }> };
    const content = data.choices?.[0]?.message?.content?.trim();

    // Validate it's actually JSON
    if (content) {
      JSON.parse(content); // will throw if not valid JSON
      return content;
    }
    return null;
  } catch (error) {
    console.warn("[transcript-engine] Ollama unavailable or returned invalid JSON:", error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Call OpenRouter (paid, cheap)
 */
async function callOpenRouterJSON(systemPrompt: string, userMessage: string): Promise<string | null> {
  if (!process.env.OPENROUTER_API_KEY) return null;

  try {
    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) return null;

    const data = await resp.json() as { choices: Array<{ message: { content: string } }> };
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch (error) {
    console.warn("[transcript-engine] OpenRouter failed:", error);
    return null;
  }
}

/**
 * Call OpenAI (paid, most expensive)
 */
async function callOpenAIJSON(systemPrompt: string, userMessage: string): Promise<string | null> {
  if (!process.env.OPENAI_API_KEY) return null;

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      }),
    });

    if (!resp.ok) return null;

    const data = await resp.json() as { choices: Array<{ message: { content: string } }> };
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch (error) {
    console.error("[transcript-engine] OpenAI failed:", error);
    return null;
  }
}

/**
 * AI Cascade: Ollama (FREE) → OpenRouter (cheap) → OpenAI (expensive)
 */
async function getAIJSONResponse(systemPrompt: string, userMessage: string): Promise<{ content: string; provider: string } | null> {
  // 1. Ollama — FREE (local)
  const ollamaResult = await callOllamaJSON(systemPrompt, userMessage);
  if (ollamaResult) {
    console.log("[transcript-engine] ✅ Used Ollama (FREE) for transcript analysis");
    return { content: ollamaResult, provider: "ollama" };
  }

  // 2. OpenRouter — cheap
  const openRouterResult = await callOpenRouterJSON(systemPrompt, userMessage);
  if (openRouterResult) {
    console.log("[transcript-engine] Used OpenRouter (paid) — start Ollama to save money");
    return { content: openRouterResult, provider: "openrouter" };
  }

  // 3. OpenAI — most expensive, last resort
  const openaiResult = await callOpenAIJSON(systemPrompt, userMessage);
  if (openaiResult) {
    console.log("[transcript-engine] Used OpenAI (PAID $$) — start Ollama to save money!");
    return { content: openaiResult, provider: "openai" };
  }

  return null;
}

/**
 * Summarize a call transcript using AI and auto-generate a cleaning estimate.
 * Called after OpenPhone delivers a call.transcript.completed webhook.
 *
 * AI Provider Priority: Ollama (FREE) → OpenRouter → OpenAI
 */
export async function summarizeTranscript(transcriptId: string): Promise<void> {
  const record = await prisma.callTranscript.findUnique({
    where: { id: transcriptId },
  });

  if (!record || record.processedAt) return;

  const dialogue = record.dialogue as DialogueEntry[];
  if (!dialogue || dialogue.length === 0) {
    await prisma.callTranscript.update({
      where: { id: transcriptId },
      data: { summary: "No dialogue in transcript.", processedAt: new Date() },
    });
    return;
  }

  // Build readable transcript text
  const companyNumber = process.env.OPENPHONE_DEFAULT_NUMBER ?? "";
  const transcriptText = dialogue
    .map((d) => {
      const speaker = d.identifier === companyNumber ? "Agent" : "Caller";
      return `[${speaker}]: ${d.content}`;
    })
    .join("\n");

  try {
    const aiResponse = await getAIJSONResponse(
      TRANSCRIPT_SYSTEM_PROMPT,
      `Analyze this call transcript:\n\n${transcriptText}`
    );

    if (!aiResponse) {
      // All AI providers failed — store raw transcript, mark for manual review
      await prisma.callTranscript.update({
        where: { id: transcriptId },
        data: {
          summary: `Call transcript (${Math.round(record.duration / 60)}min). AI analysis unavailable — manual review needed.`,
          followUpNeeded: true,
          processedAt: new Date(),
        },
      });
      return;
    }

    const analysis: TranscriptAnalysis = JSON.parse(aiResponse.content);

    // Generate estimate if we have enough info
    let estimatedTotal: number | null = null;
    let estimateBreakdown: Record<string, unknown> | null = null;
    let estimatedService: string | null = analysis.serviceType;

    if (analysis.serviceType) {
      const quoteInput: QuoteInput = {
        serviceType: analysis.serviceType,
        frequency: analysis.frequency ?? "one_time",
        locationTier: analysis.locationTier ?? "sarasota",
        bedrooms: analysis.bedrooms ?? 3,
        bathrooms: analysis.bathrooms ?? 2,
        squareFootage: analysis.sqft ?? 2000,
        addOns: (analysis.addOns ?? []).filter((a): a is QuoteInput["addOns"][number] =>
          ["inside_appliances", "interior_windows", "pressure_washing", "car_detailing", "laundry_organization", "eco_disinfection"].includes(a)
        ),
        isFirstTimeClient: true,
      };

      const breakdown = calculateQuote(quoteInput);
      estimatedTotal = breakdown.total;
      estimateBreakdown = breakdown as unknown as Record<string, unknown>;
    }

    // Update the transcript record
    await prisma.callTranscript.update({
      where: { id: transcriptId },
      data: {
        summary: analysis.summary,
        customerName: analysis.customerName,
        propertyAddress: analysis.propertyAddress,
        sqft: analysis.sqft,
        sentiment: analysis.sentiment,
        followUpNeeded: analysis.followUpNeeded,
        estimatedService,
        estimatedTotal,
        estimateBreakdown: (estimateBreakdown ?? undefined) as Prisma.InputJsonValue | undefined,
        customerPhone: record.customerPhone ?? record.fromNumber,
        processedAt: new Date(),
      },
    });

    // Send operational alert for new inbound call with estimate
    if (record.direction === "inbound") {
      const alertParts = [
        `📞 New call transcript processed`,
        analysis.customerName ? `Customer: ${analysis.customerName}` : null,
        `Duration: ${Math.round(record.duration / 60)}min`,
        analysis.summary,
        estimatedTotal ? `Est. quote: $${estimatedTotal.toFixed(2)}` : null,
        analysis.followUpNeeded ? "⚠️ Follow-up needed" : null,
        `(AI: ${aiResponse.provider})`,
      ].filter(Boolean);

      await sendOperationalSms(alertParts.join("\n"));
    }
  } catch (error) {
    console.error(`[transcript-engine] AI analysis failed for ${transcriptId}:`, error);

    await prisma.callTranscript.update({
      where: { id: transcriptId },
      data: {
        summary: `Call transcript (${Math.round(record.duration / 60)}min). AI analysis failed — manual review needed.`,
        followUpNeeded: true,
        processedAt: new Date(),
      },
    });
  }
}
