import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  ArrowRight,
  Camera,
  Database,
  FolderHeart,
  MessageCircle,
  Palette,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "InteriorAI — Final-year project: room-aware interior design" },
      { name: "description", content: "A final-year project that analyses room photos and recommends furniture using colour analysis, a transparent scoring engine and a grounded AI assistant." },
      { property: "og:title", content: "InteriorAI — Final-year project" },
      { property: "og:description", content: "Problem, objectives, pipeline, modules and tech stack of the InteriorAI project." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Landing,
});

const OBJECTIVES = [
  "Extract a room's colour palette, brightness, warmth and contrast directly from an uploaded photo.",
  "Capture user preferences — style, budget, colours, room dimensions and requirements.",
  "Rank catalogue items with a transparent, explainable scoring model.",
  "Learn from user feedback (like / dislike) to refine later recommendations.",
  "Answer follow-up design questions with an assistant grounded only in the real catalogue and the user's rooms.",
];

const PIPELINE = ["Room photo", "Pixel analysis", "User preferences", "Scoring engine", "Ranked results", "Feedback loop"];

const MODULES = [
  { icon: Camera, title: "Image upload", body: "Per-user storage of room photographs." },
  { icon: Palette, title: "Room analysis", body: "K-means colour clustering plus lighting, warmth, saturation and contrast." },
  { icon: SlidersHorizontal, title: "Preference capture", body: "Style, budget, colour, size and free-text requirements." },
  { icon: Sparkles, title: "Recommendation engine", body: "0–100 match score with reasons for every pick." },
  { icon: FolderHeart, title: "Design boards", body: "Named designs with running totals." },
  { icon: MessageCircle, title: "Design assistant", body: "Streaming chat with retrieval over catalogue and rooms." },
];

const STACK: [string, string][] = [
  ["Frontend", "React 19 · TanStack Start · Tailwind CSS"],
  ["Backend", "Server routes on an edge runtime"],
  ["Data & auth", "PostgreSQL with row-level security · email + Google"],
  ["Image analysis", "Canvas pixel sampling · k-means clustering"],
  ["Language model", "Streaming responses with retrieval context"],
];

const FUTURE = [
  "Object detection for existing furniture in the photo",
  "Image embeddings for visual similarity search",
  "AR preview of products placed in the room",
  "Learned ranking model trained on collected feedback",
];

const GLANCE: [string, string][] = [
  ["Catalogue", "26 items"],
  ["Tables", "8"],
  ["Modules", "6"],
  ["Sign-in", "email · google"],
];

function Cell({ n, title, id, className, children }: { n: string; title: string; id?: string; className?: string; children: ReactNode }) {
  return (
    <section id={id} className={cn("scroll-mt-20 rounded-xl border bg-card p-5", className)}>
      <header className="mb-4 flex items-baseline gap-3 border-b border-dashed pb-3">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        <span className="ml-auto font-mono text-[0.65rem] text-muted-foreground">{n}</span>
      </header>
      {children}
    </section>
  );
}

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 md:px-8">
          <Logo />
          <div className="flex items-center gap-3">
            <span className="hidden font-mono text-[0.68rem] text-muted-foreground sm:inline">final-year project</span>
            <Button asChild size="sm" variant="outline">
              <Link to="/auth">Open demo</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b">
        <div aria-hidden className="blueprints pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-6xl px-4 py-14 md:px-8 md:py-20">
          <p className="eyebrow">InteriorAI · final-year project</p>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.06] tracking-tight md:text-6xl">
            Recommendations that read the room before they read the catalogue.
          </h1>
          <p className="mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
            The system measures an uploaded room photograph — palette, brightness, warmth, contrast — then ranks furniture
            against those measurements and the user's stated style, budget and requirements. Every pick carries a score and
            the reasons behind it.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-2">
            <Button asChild size="lg">
              <Link to="/auth" search={{ mode: "signup" }}>
                Open the demo <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#pipeline">How it works</a>
            </Button>
          </div>
          <p className="mt-12 border-t pt-4 font-mono text-[0.68rem] leading-relaxed text-muted-foreground">
            react 19 · tanstack start · postgres + rls
            <span className="hidden sm:inline"> · edge server routes · streaming llm</span>
            <span className="block sm:hidden">edge server routes · streaming llm</span>
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-10 md:px-8 md:py-12">
        <div className="grid gap-3 md:grid-cols-6">
          <Cell n="01" title="Problem" className="md:col-span-4">
            <div className="space-y-3 text-sm leading-relaxed">
              <p>
                Online furniture catalogues know the product, not the room. Colours, light and scale are matched by eye, so
                buying is guesswork and returns are common.
              </p>
              <p className="text-muted-foreground">
                This project measures a room from a single photograph, combines that with stated preferences, and produces
                ranked, explainable recommendations — with an assistant for follow-up design questions.
              </p>
            </div>
          </Cell>

          <Cell n="02" title="At a glance" className="md:col-span-2">
            <dl className="space-y-2">
              {GLANCE.map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-3 border-b border-dashed pb-2 last:border-0 last:pb-0">
                  <dt className="text-sm text-muted-foreground">{k}</dt>
                  <dd className="font-mono text-sm">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[0.7rem] text-muted-foreground">
              <span className="flex items-center gap-1.5"><Database className="h-3.5 w-3.5" /> relational schema</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> per-user isolation</span>
            </div>
          </Cell>

          <Cell id="pipeline" n="03" title="Pipeline" className="md:col-span-2">
            <ol>
              {PIPELINE.map((p, i) => (
                <li key={p} className="flex items-center gap-3 border-b border-dashed py-2 last:border-0 last:pb-0">
                  <span className="font-mono text-[0.65rem] text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-sm">{p}</span>
                </li>
              ))}
            </ol>
          </Cell>

          <Cell n="04" title="Objectives" className="md:col-span-4">
            <ol className="grid gap-x-8 sm:grid-cols-2">
              {OBJECTIVES.map((o, i) => (
                <li key={o} className="flex gap-3 border-b border-dashed py-2.5 last:border-0">
                  <span className="font-mono text-[0.65rem] text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-sm">{o}</span>
                </li>
              ))}
            </ol>
          </Cell>

          <Cell n="05" title="Modules" className="md:col-span-3">
            <ul className="grid gap-4 sm:grid-cols-2">
              {MODULES.map((m) => (
                <li key={m.title} className="flex gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border bg-background">
                    <m.icon className="h-3.5 w-3.5 text-muted-foreground" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{m.title}</span>
                    <span className="block text-xs leading-relaxed text-muted-foreground">{m.body}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Cell>

          <Cell n="06" title="Tech stack" className="md:col-span-3">
            <dl className="space-y-3">
              {STACK.map(([k, v]) => (
                <div key={k}>
                  <dt className="eyebrow">{k}</dt>
                  <dd className="mt-1 text-sm">{v}</dd>
                </div>
              ))}
            </dl>
          </Cell>

          <Cell n="07" title="Future scope" className="md:col-span-4">
            <ul className="grid gap-x-8 sm:grid-cols-2">
              {FUTURE.map((f) => (
                <li key={f} className="flex gap-3 border-b border-dashed py-2.5 last:border-0">
                  <span className="font-mono text-[0.65rem] text-muted-foreground">+</span>
                  <span className="text-sm text-muted-foreground">{f}</span>
                </li>
              ))}
            </ul>
          </Cell>

          <section className="rounded-xl bg-ink p-5 text-ink-foreground md:col-span-2">
            <header className="mb-4 flex items-baseline gap-3 border-b border-dashed border-ink-foreground/25 pb-3">
              <h2 className="text-sm font-semibold tracking-tight">Run it</h2>
              <span className="ml-auto font-mono text-[0.65rem] opacity-60">08</span>
            </header>
            <p className="text-sm leading-relaxed opacity-80">
              Create an account, upload a room photograph, set preferences and read the ranked picks.
            </p>
            <Button asChild size="sm" variant="secondary" className="mt-4 w-full">
              <Link to="/auth" search={{ mode: "signup" }}>
                Create an account <ArrowRight />
              </Link>
            </Button>
          </section>
        </div>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 font-mono text-[0.68rem] text-muted-foreground md:px-8">
          <span>InteriorAI — final-year project</span>
          <span>react 19 · tanstack start · postgres + rls</span>
        </div>
      </footer>
    </div>
  );
}
