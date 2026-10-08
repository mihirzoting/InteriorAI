import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/AppShell";
import { deleteRoom, getRoom, saveAnalysis, signedUrl } from "@/lib/data";
import { roomAnalyzer } from "@/services/ai/room-analysis";

export const Route = createFileRoute("/_authenticated/rooms/$roomId/")({
  head: () => ({
    meta: [
      { title: "Room analysis — InteriorAI" },
      { name: "description", content: "Colour, light and tone detected in your room." },
      { property: "og:title", content: "Room analysis — InteriorAI" },
      { property: "og:description", content: "Colour, light and tone detected in your room." },
    ],
  }),
  component: Analysis,
});

const pct = (n: number) => `${Math.round(n * 100)}%`;

function Analysis() {
  const { roomId } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const room = useQuery({ queryKey: ["room", roomId], queryFn: () => getRoom(roomId) });
  const img = useQuery({
    queryKey: ["room-img", room.data?.image_path],
    queryFn: () => signedUrl(room.data!.image_path),
    enabled: !!room.data,
    staleTime: 30 * 60_000,
  });

  const reanalyze = async () => {
    if (!img.data) return;
    try {
      const blob = await (await fetch(img.data)).blob();
      await saveAnalysis(roomId, await roomAnalyzer.analyze(blob));
      qc.invalidateQueries({ queryKey: ["room", roomId] });
      toast.success("Analysis updated");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const remove = async () => {
    if (!room.data || !confirm("Delete this room and its recommendations?")) return;
    await deleteRoom(room.data);
    qc.invalidateQueries({ queryKey: ["rooms"] });
    navigate({ to: "/dashboard" });
  };

  if (room.isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!room.data) return <p>Room not found.</p>;
  const a = room.data.analysis;

  return (
    <>
      <PageHeader eyebrow={`${room.data.room_type} · Step 2 of 3`} title={room.data.name}>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={remove} aria-label="Delete room">
            <Trash2 />
          </Button>
          <Button variant="outline" className="rounded-md" onClick={reanalyze}>
            <RefreshCw /> Re-analyse
          </Button>
          <Button asChild className="rounded-md">
            <Link to="/rooms/$roomId/preferences" params={{ roomId }}>
              Preferences <ArrowRight />
            </Link>
          </Button>
        </div>
      </PageHeader>

      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div className="aspect-[4/3] overflow-hidden rounded-xl bg-muted shadow-soft">
            {img.data && <img src={img.data} alt={room.data.name} className="h-full w-full object-cover" />}
          </div>
          {a && (
            <div className="mt-4 flex h-14 overflow-hidden rounded-xl">
              {a.palette.map((c) => (
                <div key={c.hex} style={{ background: c.hex, flex: c.share }} title={`${c.name} ${pct(c.share)}`} />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6 lg:col-span-2">
          {!a ? (
            <div className="rounded-xl border p-6">
              <p>This room hasn't been analysed yet.</p>
              <Button className="mt-4 rounded-md" onClick={reanalyze}>Analyse now</Button>
            </div>
          ) : (
            <>
              <section className="rounded-xl border bg-card p-6">
                <p className="eyebrow">Dominant colours</p>
                <ul className="mt-4 space-y-3">
                  {a.palette.map((c) => (
                    <li key={c.hex} className="flex items-center gap-3">
                      <span className="h-8 w-8 rounded-lg border" style={{ background: c.hex }} />
                      <span className="flex-1 capitalize">{c.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">{c.hex}</span>
                      <span className="w-10 text-right text-sm">{pct(c.share)}</span>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="grid grid-cols-2 gap-3">
                {[
                  ["Lighting", a.lighting, pct(a.brightness)],
                  ["Tone", a.tone, a.warmth.toFixed(2)],
                  ["Saturation", a.saturation > 0.35 ? "vivid" : a.saturation > 0.18 ? "moderate" : "muted", pct(a.saturation)],
                  ["Contrast", a.contrast > 0.6 ? "high" : a.contrast > 0.35 ? "medium" : "soft", pct(a.contrast)],
                ].map(([l, v, raw]) => (
                  <div key={l} className="rounded-xl border bg-card p-4">
                    <p className="eyebrow">{l}</p>
                    <p className="mt-1 font-display text-2xl capitalize">{v}</p>
                    <p className="text-xs text-muted-foreground">{raw}</p>
                  </div>
                ))}
              </section>
              <section className="rounded-xl border bg-card p-6">
                <p className="eyebrow">Detected objects</p>
                {a.objects.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {a.objects.map((o) => (
                      <span key={o.label} className="rounded-full bg-secondary px-3 py-1 text-sm">
                        {o.label} · {pct(o.confidence)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Object detection isn't connected yet, so no objects are listed. Colour and light readings above are measured from your photo.
                  </p>
                )}
              </section>
              <p className="text-xs text-muted-foreground">
                {a.width}×{a.height}px · {a.orientation} · analysed {new Date(a.analyzedAt).toLocaleString()}
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
