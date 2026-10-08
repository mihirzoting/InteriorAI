import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import { createResponsesCall } from "@/server/ai/responses";

const json = (status: number, error: string) =>
  new Response(JSON.stringify({ error }), { status, headers: { "Content-Type": "application/json" } });

function publicClient(token?: string) {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

/**
 * Retrieval step for the assistant (RAG-lite): grounds answers in the live catalogue
 * and the user's rooms. Swap for vector search once embeddings are added.
 */
async function buildContext(token: string) {
  const sb = publicClient(token);
  const [{ data: products }, { data: rooms }] = await Promise.all([
    sb.from("products").select("name, category, style, price, colors, materials, room_types, description"),
    sb.from("rooms").select("name, room_type, analysis, room_preferences(style, budget, colors, requirements)").limit(5),
  ]);
  const catalog = (products ?? [])
    .map((p) => `- ${p.name} | ${p.category} | ${p.style} | $${p.price} | ${p.colors.join("/")} | ${p.materials.join("/")} | for ${p.room_types.join("/")}: ${p.description}`)
    .join("\n");
  const roomCtx = (rooms ?? [])
    .map((r) => {
      const a = r.analysis as { palette?: { name: string; share: number }[]; lighting?: string; tone?: string } | null;
      const pref = (r.room_preferences as unknown as { style: string; budget: number | null; colors: string[]; requirements: string | null }[] | null)?.[0];
      return `- "${r.name}" (${r.room_type})${a ? `: palette ${a.palette?.slice(0, 4).map((c) => c.name).join(", ")}; ${a.lighting} light; ${a.tone} tone` : ""}${pref ? `; wants ${pref.style}, budget ${pref.budget ?? "n/a"}, colours ${pref.colors.join(", ") || "any"}, notes: ${pref.requirements ?? "none"}` : ""}`;
    })
    .join("\n");
  return `You are the InteriorAI design assistant: a warm, expert interior designer.
Give concise, practical advice (layout, colour, lighting, materials, scale). Use markdown with short lists.
When suggesting products, ONLY recommend items from this catalogue, by exact name and price. If nothing fits, say so.

CATALOGUE:
${catalog}

USER'S ROOMS:
${roomCtx || "(none uploaded yet)"}`;
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
        if (!token || token.split(".").length !== 3) return json(401, "Please sign in");
        const { data: claims, error } = await publicClient().auth.getClaims(token);
        if (error || !claims?.claims?.sub) return json(401, "Please sign in");

        const apiKey = process.env["OPENAI_API_KEY"];
        if (!apiKey) return json(500, "AI is not configured");

        let body: { messages?: UIMessage[] };
        try {
          body = await request.json();
        } catch {
          return json(400, "Invalid request");
        }
        if (!Array.isArray(body.messages) || body.messages.length === 0) return json(400, "No messages");
        const messages = body.messages.slice(-30);

        const instructions = await buildContext(token);
        return createResponsesCall(
          request,
          {
            baseURL: process.env["OPENAI_BASE_URL"] ?? "https://api.openai.com/v1",
            apiKey,
            model: process.env["OPENAI_MODEL"] ?? "gpt-4o-mini",
          },
          await convertToModelMessages(messages),
          instructions,
        ).response();
      },
    },
  },
});
