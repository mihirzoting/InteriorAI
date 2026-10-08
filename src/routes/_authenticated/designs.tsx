import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/AppShell";
import { formatPrice, productImage } from "@/lib/catalog";
import { createDesign, deleteDesign, listDesigns, removeDesignItem } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/designs")({
  head: () => ({
    meta: [
      { title: "Saved designs — InteriorAI" },
      { name: "description", content: "Your curated collections of furniture and decor." },
      { property: "og:title", content: "Saved designs — InteriorAI" },
      { property: "og:description", content: "Your curated collections of furniture and decor." },
    ],
  }),
  component: Designs,
});

function Designs() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ["designs"], queryFn: listDesigns });
  const [name, setName] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["designs"] });

  const create = async () => {
    if (!name.trim()) return;
    try {
      await createDesign(name.trim(), null);
      setName("");
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <>
      <PageHeader eyebrow="Collections" title="Saved designs">
        <div className="flex gap-2">
          <Input placeholder="New design" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && create()} />
          <Button className="rounded-md" onClick={create}>
            <Plus /> Create
          </Button>
        </div>
      </PageHeader>
      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : data.length === 0 ? (
        <p className="text-muted-foreground">No designs yet. Save pieces from your recommendations to start one.</p>
      ) : (
        <div className="space-y-12">
          {data.map((d) => {
            const total = d.design_items.reduce((s, i) => s + Number(i.product.price), 0);
            return (
              <section key={d.id}>
                <div className="mb-4 flex items-end justify-between border-b pb-3">
                  <div>
                    <h2 className="text-3xl font-light">{d.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {d.design_items.length} pieces · {formatPrice(total)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete design"
                    onClick={async () => {
                      if (confirm(`Delete “${d.name}”?`)) {
                        await deleteDesign(d.id);
                        refresh();
                      }
                    }}
                  >
                    <Trash2 />
                  </Button>
                </div>
                {d.design_items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Empty — save products here from recommendations.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                    {d.design_items.map((it) => (
                      <div key={it.id} className="group relative">
                        <Link to="/products/$productId" params={{ productId: it.product.id }}>
                          <img src={productImage(it.product.image_key)} alt={it.product.name} loading="lazy" className="aspect-square w-full rounded-xl object-cover" />
                          <p className="mt-2 text-sm font-medium">{it.product.name}</p>
                          <p className="text-xs text-muted-foreground">{formatPrice(it.product.price)}</p>
                        </Link>
                        <button
                          aria-label="Remove"
                          onClick={async () => {
                            await removeDesignItem(it.id);
                            refresh();
                          }}
                          className="absolute right-2 top-2 rounded-full bg-card/90 p-1.5 opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
