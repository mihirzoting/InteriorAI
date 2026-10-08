import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/AppShell";
import { COLOR_OPTIONS, STYLES } from "@/lib/catalog";
import { generateRecommendations, getPrefs, getRoom, savePrefs } from "@/lib/data";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/rooms/$roomId/preferences")({
  head: () => ({
    meta: [
      { title: "Preferences — InteriorAI" },
      { name: "description", content: "Set your style, budget, colours and room dimensions." },
      { property: "og:title", content: "Preferences — InteriorAI" },
      { property: "og:description", content: "Set your style, budget, colours and room dimensions." },
    ],
  }),
  component: Preferences,
});

const SWATCH: Record<string, string> = {
  white: "#f2efe9", cream: "#e8dcc4", beige: "#c8b496", natural: "#b89468", grey: "#8c8c8c", black: "#1e1e1e",
  brown: "#6e482d", green: "#466e46", terracotta: "#b45a3c", pink: "#d6a0a0", gold: "#c4a046", blue: "#466496",
};

function Preferences() {
  const { roomId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const room = useQuery({ queryKey: ["room", roomId], queryFn: () => getRoom(roomId) });
  const prefs = useQuery({ queryKey: ["prefs", roomId], queryFn: () => getPrefs(roomId) });
  const [style, setStyle] = useState<string>("Modern");
  const [budget, setBudget] = useState("");
  const [colors, setColors] = useState<string[]>([]);
  const [w, setW] = useState("");
  const [l, setL] = useState("");
  const [h, setH] = useState("");
  const [req, setReq] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (prefs.data) {
      const p = prefs.data;
      setStyle(p.style);
      setBudget(p.budget?.toString() ?? "");
      setColors(p.colors);
      setW(p.width_m?.toString() ?? "");
      setL(p.length_m?.toString() ?? "");
      setH(p.height_m?.toString() ?? "");
      setReq(p.requirements ?? "");
    } else if (prefs.isSuccess) {
      supabase.from("profiles").select("default_style, default_budget").maybeSingle().then(({ data }) => {
        if (data?.default_style) setStyle(data.default_style);
        if (data?.default_budget) setBudget(String(data.default_budget));
      });
    }
  }, [prefs.data, prefs.isSuccess]);

  const num = (s: string) => (s.trim() && !isNaN(Number(s)) ? Number(s) : null);

  const submit = async () => {
    setBusy(true);
    try {
      await savePrefs(roomId, { style, budget: num(budget), colors, width_m: num(w), length_m: num(l), height_m: num(h), requirements: req.trim() || null });
      await generateRecommendations(roomId);
      qc.invalidateQueries({ queryKey: ["prefs", roomId] });
      qc.invalidateQueries({ queryKey: ["recs", roomId] });
      navigate({ to: "/rooms/$roomId/recommendations", params: { roomId } });
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
    }
  };

  const detected = room.data?.analysis?.palette.filter((c) => c.share > 0.08).map((c) => c.name) ?? [];

  return (
    <>
      <PageHeader eyebrow={`${room.data?.name ?? ""} · Step 3 of 3`} title="Your preferences" />
      <div className="grid max-w-4xl gap-10">
        <section>
          <Label className="eyebrow">Interior style</Label>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {STYLES.map((s) => (
              <button
                key={s}
                onClick={() => setStyle(s)}
                className={cn(
                  "rounded-xl border p-4 text-left font-display text-xl transition-colors",
                  style === s ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-secondary",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </section>

        <section>
          <Label className="eyebrow">Preferred colours</Label>
          {detected.length > 0 && <p className="mt-1 text-sm text-muted-foreground">Detected in your room: {detected.join(", ")}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {COLOR_OPTIONS.map((c) => {
              const on = colors.includes(c);
              return (
                <button
                  key={c}
                  onClick={() => setColors(on ? colors.filter((x) => x !== c) : [...colors, c])}
                  className={cn("flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm capitalize", on ? "border-foreground bg-secondary" : "hover:bg-secondary")}
                >
                  <span className="h-4 w-4 rounded-full border" style={{ background: SWATCH[c] }} />
                  {c}
                </button>
              );
            })}
          </div>
        </section>

        <section className="grid gap-6 sm:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="budget">Total budget ($)</Label>
            <Input id="budget" inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="5000" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="w">Width (m)</Label>
            <Input id="w" inputMode="decimal" value={w} onChange={(e) => setW(e.target.value)} placeholder="4" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="l">Length (m)</Label>
            <Input id="l" inputMode="decimal" value={l} onChange={(e) => setL(e.target.value)} placeholder="5" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="h">Ceiling (m)</Label>
            <Input id="h" inputMode="decimal" value={h} onChange={(e) => setH(e.target.value)} placeholder="2.6" />
          </div>
        </section>

        <section className="space-y-2">
          <Label htmlFor="req">Requirements</Label>
          <Textarea id="req" rows={4} value={req} onChange={(e) => setReq(e.target.value)} placeholder="e.g. need storage for books, better lighting, cozy seating for guests" />
        </section>

        <Button size="lg" className="w-fit rounded-md" onClick={submit} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : null} Get recommendations
        </Button>
      </div>
    </>
  );
}
