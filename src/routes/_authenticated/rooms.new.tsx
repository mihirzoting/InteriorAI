import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/AppShell";
import { ROOM_TYPES } from "@/lib/catalog";
import { createRoom, saveAnalysis } from "@/lib/data";
import { roomAnalyzer } from "@/services/ai/room-analysis";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/rooms/new")({
  head: () => ({
    meta: [
      { title: "Upload a room — InteriorAI" },
      { name: "description", content: "Upload a photo of your room to begin." },
      { property: "og:title", content: "Upload a room — InteriorAI" },
      { property: "og:description", content: "Upload a photo of your room to begin." },
    ],
  }),
  component: NewRoom,
});

function NewRoom() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [roomType, setRoomType] = useState<string>("Living Room");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const pick = (f: File | undefined) => {
    if (!f) return undefined;
    if (!f.type.startsWith("image/")) { toast.error("Please choose an image file"); return undefined; }
    if (f.size > 10 * 1024 * 1024) { toast.error("Image must be under 10MB"); return undefined; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!file) return;
    try {
      setBusy("Uploading photo…");
      const id = await createRoom(file, roomType, name.trim() || roomType);
      setBusy("Analysing room…");
      const analysis = await roomAnalyzer.analyze(file);
      await saveAnalysis(id, analysis);
      qc.invalidateQueries({ queryKey: ["rooms"] });
      navigate({ to: "/rooms/$roomId", params: { roomId: id } });
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(null);
    }
  };

  return (
    <>
      <PageHeader eyebrow="Step 1 of 3" title="Upload your room" />
      <div className="grid gap-10 lg:grid-cols-5">
        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            pick(e.dataTransfer.files[0]);
          }}
          className="relative flex aspect-[4/3] cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-card lg:col-span-3"
        >
          {preview ? (
            <img src={preview} alt="Room preview" className="h-full w-full object-cover" />
          ) : (
            <div className="text-center text-muted-foreground">
              <ImagePlus className="mx-auto h-10 w-10" />
              <p className="mt-3 font-medium text-foreground">Drop a photo or click to browse</p>
              <p className="text-sm">JPG, PNG or WEBP · up to 10MB</p>
            </div>
          )}
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
        </label>
        <div className="space-y-6 lg:col-span-2">
          <div className="space-y-2">
            <Label htmlFor="rname">Room name</Label>
            <Input id="rname" placeholder="e.g. Upstairs bedroom" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Room type</Label>
            <div className="flex flex-wrap gap-2">
              {ROOM_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setRoomType(t)}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm transition-colors",
                    roomType === t ? "border-primary bg-primary text-primary-foreground" : "hover:bg-secondary",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <Button size="lg" className="w-full rounded-md" disabled={!file || !!busy} onClick={submit}>
            {busy ? (
              <>
                <Loader2 className="animate-spin" /> {busy}
              </>
            ) : (
              "Upload & analyse"
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
