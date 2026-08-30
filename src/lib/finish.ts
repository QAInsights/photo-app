import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  imageDataUrl: z.string().min(32).max(8_000_000),
  prompt: z.string().min(8).max(2000),
  aspectRatio: z.string().max(12),
  resolution: z.enum(["1k", "2k"]),
});

type FinishOk = { ok: true; imageDataUrl: string };
type FinishErr = { ok: false; error: string };
export type FinishResult = FinishOk | FinishErr;

const MODELS = ["grok-imagine-image-2.0", "grok-imagine-image-quality"] as const;

async function toDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not fetch the finished image.");
  const buf = Buffer.from(await res.arrayBuffer());
  const mime = res.headers.get("content-type")?.split(";")[0] || "image/jpeg";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

async function callEdits(
  apiKey: string,
  model: string,
  data: z.infer<typeof Input>,
  signal: AbortSignal,
): Promise<FinishResult> {
  const res = await fetch("https://api.x.ai/v1/images/edits", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    signal,
    body: JSON.stringify({
      model,
      prompt: data.prompt,
      image: { url: data.imageDataUrl, type: "image_url" },
      aspect_ratio: data.aspectRatio,
      resolution: data.resolution,
      quality: data.resolution === "2k" ? "medium" : "low",
      n: 1,
      response_format: "b64_json",
    }),
  });

  if (!res.ok) {
    let detail = `Studio returned ${res.status}`;
    try {
      const body = (await res.json()) as {
        error?: { message?: string } | string;
      };
      if (typeof body.error === "string") detail = body.error;
      else if (body.error?.message) detail = body.error.message;
    } catch {
      /* ignore parse */
    }
    return { ok: false, error: detail };
  }

  const body = (await res.json()) as {
    data?: { b64_json?: string; url?: string }[];
  };
  const item = body.data?.[0];
  if (item?.b64_json) {
    return { ok: true, imageDataUrl: `data:image/jpeg;base64,${item.b64_json}` };
  }
  if (item?.url) {
    return { ok: true, imageDataUrl: await toDataUrl(item.url) };
  }
  return { ok: false, error: "Studio returned an empty image." };
}

export const finishPhoto = createServerFn({ method: "POST" })
  .validator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<FinishResult> => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return {
        ok: false,
        error: "Studio AI is not available in this environment.",
      };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 110_000);

    try {
      let last: FinishResult = { ok: false, error: "Studio request failed." };
      for (const model of MODELS) {
        try {
          last = await callEdits(apiKey, model, data, controller.signal);
          if (last.ok) return last;
        } catch (err) {
          const message = err instanceof Error ? err.message : "Network error";
          last = { ok: false, error: message };
        }
      }
      return last;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return {
          ok: false,
          error: "Studio took too long. Try 1K or a smaller photo.",
        };
      }
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Studio request failed.",
      };
    } finally {
      clearTimeout(timer);
    }
  });

export const studioStatus = createServerFn({ method: "GET" }).handler(
  async () => ({ available: Boolean(process.env.XAI_API_KEY) }),
);
