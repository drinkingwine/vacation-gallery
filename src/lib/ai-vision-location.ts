export type VisionLocationSuggestion = {
  label: string;
  query: string;
  confidence: number;
  rationale: string;
  latitude?: number | null;
  longitude?: number | null;
};

export type VisionLocationResult = {
  provider: "openai" | "anthropic" | "xai";
  model: string;
  suggestions: VisionLocationSuggestion[];
};

type ProviderConfig = {
  id: VisionLocationResult["provider"];
  model: string;
  apiKey: string;
  url: string;
  style: "openai" | "anthropic";
};

const SYSTEM_PROMPT = `You identify possible real-world locations from vacation / travel photographs.
Return ONLY valid JSON matching this schema:
{
  "suggestions": [
    {
      "label": "Human-friendly place name",
      "query": "Geocoder-friendly search string",
      "confidence": 0.0,
      "rationale": "Short visual evidence",
      "latitude": null,
      "longitude": null
    }
  ]
}

Rules:
- Offer 1–3 ranked guesses (best first). Prefer specific places over countries when evidence supports it.
- confidence is 0–1. Be conservative for underwater or generic scenes.
- latitude/longitude only when reasonably sure; otherwise null.
- Do not invent landmarks that are not supported by the image.
- If the image cannot be located, return an empty suggestions array.`;

function buildUserPrompt(context?: {
  tripTitle?: string | null;
  tripLocation?: string | null;
  filename?: string | null;
}): string {
  const hints = [
    context?.tripTitle ? `Trip title: ${context.tripTitle}` : null,
    context?.tripLocation ? `Trip location hint: ${context.tripLocation}` : null,
    context?.filename ? `Filename: ${context.filename}` : null,
  ].filter(Boolean);

  return [
    "Identify possible locations for this photo.",
    hints.length > 0
      ? `Context (may be wrong or incomplete — trust the image first):\n${hints.join("\n")}`
      : "No extra context provided.",
  ].join("\n\n");
}

function getProviders(): ProviderConfig[] {
  const providers: ProviderConfig[] = [];

  const openai = process.env.OPENAI_API_KEY?.trim();
  if (openai) {
    providers.push({
      id: "openai",
      model: process.env.OPENAI_VISION_MODEL?.trim() || "gpt-4o",
      apiKey: openai,
      url: "https://api.openai.com/v1/chat/completions",
      style: "openai",
    });
  }

  const anthropic = process.env.ANTHROPIC_API_KEY?.trim();
  if (anthropic) {
    providers.push({
      id: "anthropic",
      model:
        process.env.ANTHROPIC_VISION_MODEL?.trim() ||
        "claude-sonnet-4-20250514",
      apiKey: anthropic,
      url: "https://api.anthropic.com/v1/messages",
      style: "anthropic",
    });
  }

  const xai = process.env.XAI_API_KEY?.trim();
  if (xai) {
    providers.push({
      id: "xai",
      model: process.env.XAI_VISION_MODEL?.trim() || "grok-2-vision-1212",
      apiKey: xai,
      url: "https://api.x.ai/v1/chat/completions",
      style: "openai",
    });
  }

  return providers;
}

export function hasVisionLocationProvider(): boolean {
  return getProviders().length > 0;
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      return JSON.parse(fenced[1].trim());
    }
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("Model did not return JSON");
  }
}

function normalizeSuggestions(raw: unknown): VisionLocationSuggestion[] {
  if (!raw || typeof raw !== "object") return [];
  const suggestions = (raw as { suggestions?: unknown }).suggestions;
  if (!Array.isArray(suggestions)) return [];

  const normalized: VisionLocationSuggestion[] = [];

  for (const item of suggestions) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const label = typeof record.label === "string" ? record.label.trim() : "";
    const query =
      typeof record.query === "string" ? record.query.trim() : label;
    if (!label && !query) continue;

    const confidenceRaw =
      typeof record.confidence === "number" ? record.confidence : 0.4;
    const confidence = Math.max(0, Math.min(1, confidenceRaw));
    const rationale =
      typeof record.rationale === "string" ? record.rationale.trim() : "";
    const latitude =
      typeof record.latitude === "number" && Number.isFinite(record.latitude)
        ? record.latitude
        : null;
    const longitude =
      typeof record.longitude === "number" && Number.isFinite(record.longitude)
        ? record.longitude
        : null;

    normalized.push({
      label: label || query,
      query: query || label,
      confidence,
      rationale,
      latitude,
      longitude,
    });
  }

  return normalized.slice(0, 3);
}

async function fetchImageAsDataUrl(imageUrl: string): Promise<{
  mediaType: string;
  dataUrl: string;
  base64: string;
}> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image (${response.status})`);
  }

  const contentType = response.headers.get("content-type") || "image/jpeg";
  const mediaType = contentType.split(";")[0]?.trim() || "image/jpeg";
  if (!mediaType.startsWith("image/")) {
    throw new Error("URL did not return an image");
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  // Keep payloads reasonable for vision APIs.
  if (buffer.byteLength > 12 * 1024 * 1024) {
    throw new Error("Image is too large to send to the vision API");
  }

  const base64 = buffer.toString("base64");
  return {
    mediaType,
    base64,
    dataUrl: `data:${mediaType};base64,${base64}`,
  };
}

async function callOpenAiStyleProvider(
  provider: ProviderConfig,
  prompt: string,
  dataUrl: string,
): Promise<string> {
  const response = await fetch(provider.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: provider.model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
  });

  const data = (await response.json()) as {
    error?: { message?: string };
    choices?: Array<{ message?: { content?: string } }>;
  };

  if (!response.ok) {
    throw new Error(
      data.error?.message || `${provider.id} request failed (${response.status})`,
    );
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error(`${provider.id} returned an empty response`);
  }
  return content;
}

async function callAnthropicProvider(
  provider: ProviderConfig,
  prompt: string,
  mediaType: string,
  base64: string,
): Promise<string> {
  const response = await fetch(provider.url, {
    method: "POST",
    headers: {
      "x-api-key": provider.apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: provider.model,
      max_tokens: 1024,
      temperature: 0.2,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64,
              },
            },
            { type: "text", text: prompt },
          ],
        },
      ],
    }),
  });

  const data = (await response.json()) as {
    error?: { message?: string };
    content?: Array<{ type?: string; text?: string }>;
  };

  if (!response.ok) {
    throw new Error(
      data.error?.message ||
        `anthropic request failed (${response.status})`,
    );
  }

  const text = data.content?.find((part) => part.type === "text")?.text;
  if (!text) {
    throw new Error("anthropic returned an empty response");
  }
  return text;
}

export async function identifyLocationFromImage(options: {
  imageUrl: string;
  tripTitle?: string | null;
  tripLocation?: string | null;
  filename?: string | null;
  preferredProvider?: VisionLocationResult["provider"] | null;
}): Promise<VisionLocationResult> {
  const providers = getProviders();
  if (providers.length === 0) {
    throw new Error(
      "No vision API configured. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or XAI_API_KEY.",
    );
  }

  const ordered = options.preferredProvider
    ? [
        ...providers.filter((p) => p.id === options.preferredProvider),
        ...providers.filter((p) => p.id !== options.preferredProvider),
      ]
    : providers;

  const image = await fetchImageAsDataUrl(options.imageUrl);
  const prompt = buildUserPrompt(options);

  let lastError: Error | null = null;

  for (const provider of ordered) {
    try {
      const content =
        provider.style === "anthropic"
          ? await callAnthropicProvider(
              provider,
              prompt,
              image.mediaType,
              image.base64,
            )
          : await callOpenAiStyleProvider(provider, prompt, image.dataUrl);

      const parsed = extractJsonObject(content);
      return {
        provider: provider.id,
        model: provider.model,
        suggestions: normalizeSuggestions(parsed),
      };
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error("Vision provider failed");
    }
  }

  throw lastError ?? new Error("All vision providers failed");
}
