import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/AppShell";
import { ProductCard } from "@/components/ProductCard";
import { formatPrice } from "@/lib/catalog";
import { generateRecommendations, getPrefs, getRoom, giveFeedback, listRecommendations, myFeedback } from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/rooms/$roomId/recommendations")({
  head: () => ({
    meta: [
      { title: "Recommendations — InteriorAI" },
      { name: "description", content: "Furniture and decor picked for your room." },
      { property: "og:title", content: "Recommendations — InteriorAI" },
      { property: "og:description", content: "Furniture and decor picked for your room." },
    ],
  }),
  component: Recs,
});

function Recs() {
  const { roomId } = Route.useParams();
  const qc = useQueryClient();
  const room = useQuery({ queryKey: ["room", roomId], queryFn: () => getRoom(roomId) });
  const prefs = useQuery({ queryKey: ["prefs", roomId], queryFn: () => getPrefs(roomId) });
  const recs = useQuery({ queryKey: ["recs", roomId], queryFn: () => listRecommendations(roomId) });
  const fb = useQuery({ queryKey: ["feedback", roomId], queryFn: () => myFeedback(roomId) });
  const [cat, setCat] = useState("All");
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    setBusy(true);
    try {
      await generateRecommendations(roomId);
      await qc.invalidateQueries({ queryKey: ["recs", roomId] });
      toast.success("Recommendations refreshed with your feedback");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const rate = async (productId: string, r: 1 | -1) => {
    try {
      await giveFeedback(productId, roomId, r);
      qc.invalidateQueries({ queryKey: ["feedback", roomId] });
      toast(r > 0 ? "Thanks — we'll favour similar pieces" : "Got it — refresh to replace it");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const list = recs.data ?? [];
  const cats = ["All", ...Array.from(new Set(list.map((r) => r.product.category)))];
  const shown = cat === "All" ? list : list.filter((r) => r.product.category === cat);
  const ratingOf = (pid: string) => fb.data?.find((f) => f.product_id === pid)?.rating ?? null;

  return (
    <>
      <PageHeader eyebrow={room.data?.name} title="Recommended for you">
        <div className="flex gap-2">
          <Button asChild variant="outline" className="rounded-md">
            <Link to="/rooms/$roomId/preferences" params={{ roomId }}>
              <SlidersHorizontal /> Edit preferences
            </Link>
          </Button>
          <Button className="rounded-md" onClick={refresh} disabled={busy || !prefs.data}>
            <RefreshCw className={cn(busy && "animate-spin")} /> Refresh
          </Button>
        </div>
      </PageHeader>

      {prefs.data && (
        <p className="mb-6 text-sm text-muted-foreground">
          {prefs.data.style} · {room.data?.room_type}
          {prefs.data.budget ? ` · ${formatPrice(prefs.data.budget)} budget` : ""}
          {prefs.data.colors.length ? ` · ${prefs.data.colors.join(", ")}` : ""}
        </p>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {cats.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={cn("rounded-full border px-4 py-1.5 text-sm", cat === c ? "border-foreground bg-foreground text-background" : "hover:bg-secondary")}
          >
            {c}
          </button>
        ))}
      </div>

      {recs.isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : list.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <p>No recommendations yet.</p>
          <Button asChild className="mt-4 rounded-md">
            <Link to="/rooms/$roomId/preferences" params={{ roomId }}>Set preferences</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((r) => (
            <ProductCard
              key={r.id}
              product={r.product}
              score={Math.round(r.score)}
              reasons={r.reasons}
              rating={ratingOf(r.product.id)}
              onFeedback={(v) => rate(r.product.id, v)}
              roomId={roomId}
            />
          ))}
        </div>
      )}
    </>
  );
}
