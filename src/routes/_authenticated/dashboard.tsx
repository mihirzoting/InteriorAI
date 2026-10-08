import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/AppShell";
import { listDesigns, listRooms, signedUrl, type Room } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — InteriorAI" },
      { name: "description", content: "Your rooms and designs at a glance." },
      { property: "og:title", content: "Dashboard — InteriorAI" },
      { property: "og:description", content: "Your rooms and designs at a glance." },
    ],
  }),
  component: Dashboard,
});

function RoomTile({ room }: { room: Room }) {
  const { data: url } = useQuery({ queryKey: ["room-img", room.image_path], queryFn: () => signedUrl(room.image_path), staleTime: 30 * 60_000 });
  return (
    <Link to="/rooms/$roomId" params={{ roomId: room.id }} className="group relative block aspect-[4/3] overflow-hidden rounded-xl bg-muted shadow-soft">
      {url && <img src={url} alt={room.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />}
      <div className="absolute inset-0 bg-veil" />
      <div className="absolute bottom-4 left-4 right-4 text-ink-foreground">
        <p className="font-mono text-[0.65rem] uppercase tracking-widest opacity-80">{room.room_type}</p>
        <p className="text-base font-semibold">{room.name}</p>
      </div>
    </Link>
  );
}

function Dashboard() {
  const rooms = useQuery({ queryKey: ["rooms"], queryFn: listRooms });
  const designs = useQuery({ queryKey: ["designs"], queryFn: listDesigns });
  return (
    <>
      <PageHeader eyebrow="Your studio" title="Dashboard">
        <Button asChild className="rounded-md">
          <Link to="/rooms/new">
            <Plus /> New room
          </Link>
        </Button>
      </PageHeader>

      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          ["Rooms", rooms.data?.length ?? 0],
          ["Designs", designs.data?.length ?? 0],
          ["Saved pieces", designs.data?.reduce((n, d) => n + d.design_items.length, 0) ?? 0],
        ].map(([l, v]) => (
          <div key={l} className="rounded-xl border bg-card p-4">
            <p className="eyebrow">{l}</p>
            <p className="mt-2 font-mono text-2xl">{v}</p>
          </div>
        ))}
      </div>

      <h2 className="mb-4 text-lg font-semibold">Your rooms</h2>
      {rooms.isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : rooms.data?.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.data.map((r) => (
            <RoomTile key={r.id} room={r} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <h3 className="text-lg font-semibold">Start with a photo</h3>
          <p className="mt-2 text-sm text-muted-foreground">Upload your first room to get tailored recommendations.</p>
          <Button asChild className="mt-6 rounded-md">
            <Link to="/rooms/new">
              Upload a room <ArrowRight />
            </Link>
          </Button>
        </div>
      )}
    </>
  );
}
