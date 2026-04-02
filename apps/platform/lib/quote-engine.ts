import { prisma } from "@/lib/prisma";

const serviceBaseRates: Record<string, number> = {
  HOME_CLEAN: 0.22,
  PRESSURE_WASH: 0.35,
  AUTO_DETAIL: 0.28,
  CUSTOM: 0.32,
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AI Provider Cascade: Ollama (FREE) → OpenRouter → OpenAI (paid)
// Ollama runs locally on your machine = $0 per quote forever
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "mistral-nemo";

type QuoteResult = {
  subtotal: number;
  fees: number;
  taxes: number;
  total: number;
  smartNotes?: string;
};

type QuoteRequest = {
  squareFootage?: number | null;
  serviceType: string;
  surfaces: string[];
  customerName?: string | null;
  notes?: string | null;
  city?: string | null;
  preferredWindows?: unknown;
};

/**
 * Call Ollama (local, free) with OpenAI-compatible API
 */
async function callOllama(systemPrompt: string, userMessage: string): Promise<string | null> {
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
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(30000), // 30s timeout
    });

    if (!resp.ok) return null;

    const data = await resp.json() as { choices: Array<{ message: { content: string } }> };
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    console.warn("[quote-engine] Ollama unavailable, will try paid fallbacks");
    return null;
  }
}

/**
 * Call OpenAI (paid fallback)
 */
async function callOpenAI(systemPrompt: string, userMessage: string): Promise<string | null> {
  if (!process.env.OPENAI_API_KEY) return null;

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!resp.ok) return null;

    const data = await resp.json() as { choices: Array<{ message: { content: string } }> };
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch (error) {
    console.error("[quote-engine] OpenAI failed:", error);
    return null;
  }
}

/**
 * AI cascade: tries Ollama first (free), then OpenAI (paid)
 */
async function getAIResponse(systemPrompt: string, userMessage: string): Promise<string | null> {
  // 1. Try Ollama (FREE — runs on your Mac/server)
  const ollamaResult = await callOllama(systemPrompt, userMessage);
  if (ollamaResult) {
    console.log("[quote-engine] Used Ollama (FREE) for quote summary");
    return ollamaResult;
  }

  // 2. Fallback to OpenAI (PAID — only if Ollama is down)
  const openaiResult = await callOpenAI(systemPrompt, userMessage);
  if (openaiResult) {
    console.log("[quote-engine] Used OpenAI (PAID) — consider starting Ollama to save money");
    return openaiResult;
  }

  return null;
}

export const estimateQuote = async (request: QuoteRequest): Promise<QuoteResult> => {
  const squareFootage = request.squareFootage ?? 2000;
  const baseRate =
    serviceBaseRates[request.serviceType] ?? serviceBaseRates.CUSTOM;
  const laborCost = squareFootage * baseRate;
  const surfacesMultiplier =
    1 + (request.surfaces.length - 1) * 0.06;
  const subtotal = Math.max(120, laborCost * surfacesMultiplier);
  const fees = subtotal * 0.05;
  const taxes = (subtotal + fees) * 0.07;

  const systemPrompt =
    "You are a helpful assistant that creates short, friendly summaries of cleaning requests based on the quote calculation details provided.";

  const message = `You are an environmentally minded cleaning concierge. Create a short summary for a quote with these details:
${JSON.stringify(
  {
    serviceType: request.serviceType,
    squareFootage: squareFootage,
    city: request.city,
    surfaces: request.surfaces,
    preferredWindows: request.preferredWindows,
    total: subtotal + fees + taxes,
  },
  null,
  2
)}`;

  const smartNotes = await getAIResponse(systemPrompt, message);

  return {
    subtotal,
    fees,
    taxes,
    total: subtotal + fees + taxes,
    smartNotes: smartNotes || "Your quote has been calculated based on square footage, surfaces, and service type.",
  };
};

export const generateQuoteForRequest = async (
  requestId: string
): Promise<void> => {
  const request = await prisma.serviceRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new Error("Service request not found.");
  }

  const quoteData = await estimateQuote(request);

  await prisma.quote.upsert({
    where: { requestId },
    update: {
      subtotal: quoteData.subtotal,
      fees: quoteData.fees,
      taxes: quoteData.taxes,
      total: quoteData.total,
      smartNotes: quoteData.smartNotes,
    },
    create: {
      subtotal: quoteData.subtotal,
      fees: quoteData.fees,
      taxes: quoteData.taxes,
      total: quoteData.total,
      smartNotes: quoteData.smartNotes,
      requestId,
    },
  });
};
