import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { addToDesign, createDesign, listDesigns } from "@/lib/data";

export function SaveToDesign({ productId, roomId }: { productId: string; roomId: string | null }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const { data: designs = [] } = useQuery({ queryKey: ["designs"], queryFn: listDesigns, enabled: open });

  const save = async (designId: string, label: string) => {
    try {
      await addToDesign(designId, productId);
      toast.success(`Saved to ${label}`);
      qc.invalidateQueries({ queryKey: ["designs"] });
      setOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const create = async () => {
    if (!name.trim()) return;
    try {
      const id = await createDesign(name.trim(), roomId);
      await save(id, name.trim());
      setName("");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-md">
          <Bookmark /> Save
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <p className="eyebrow mb-2">Save to design</p>
        <div className="max-h-48 space-y-1 overflow-y-auto">
          {designs.map((d) => (
            <button key={d.id} onClick={() => save(d.id, d.name)} className="w-full rounded-md px-2 py-2 text-left text-sm hover:bg-secondary">
              {d.name} <span className="text-muted-foreground">· {d.design_items.length}</span>
            </button>
          ))}
          {designs.length === 0 && <p className="px-2 py-1 text-sm text-muted-foreground">No designs yet.</p>}
        </div>
        <div className="mt-3 flex gap-2 border-t pt-3">
          <Input placeholder="New design name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && create()} />
          <Button size="icon" onClick={create} aria-label="Create design">
            <Plus />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
