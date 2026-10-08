import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SaveToDesign } from "@/components/SaveToDesign";
import { ProductCard } from "@/components/ProductCard";
import { formatPrice, productImage } from "@/lib/catalog";
import { getProduct, listProducts } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/products/$productId")({
  head: () => ({
    meta: [
      { title: "Product details — InteriorAI" },
      { name: "description", content: "Materials, dimensions and styling notes." },
      { property: "og:title", content: "Product details — InteriorAI" },
      { property: "og:description", content: "Materials, dimensions and styling notes." },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { productId } = Route.useParams();
  const router = useRouter();
  const p = useQuery({ queryKey: ["product", productId], queryFn: () => getProduct(productId) });
  const all = useQuery({ queryKey: ["products"], queryFn: listProducts });
  if (p.isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (!p.data) return <p>Product not found.</p>;
  const prod = p.data;
  const related = (all.data ?? []).filter((x) => x.id !== prod.id && (x.style === prod.style || x.category === prod.category)).slice(0, 3);

  return (
    <>
      <Button variant="ghost" className="mb-6 -ml-3" onClick={() => router.history.back()}>
        <ArrowLeft /> Back
      </Button>
      <div className="grid gap-10 lg:grid-cols-2">
        <img src={productImage(prod.image_key)} alt={prod.name} width={816} height={816} className="aspect-square w-full rounded-xl object-cover shadow-soft" />
        <div className="flex flex-col">
          <p className="eyebrow">{prod.category} · {prod.style}</p>
          <h1 className="mt-2 text-5xl font-light">{prod.name}</h1>
          <p className="mt-4 font-display text-3xl">{formatPrice(prod.price)}</p>
          <p className="mt-6 text-lg text-muted-foreground">{prod.description}</p>
          <dl className="mt-8 grid grid-cols-2 gap-4 border-t pt-6 text-sm">
            {[
              ["Dimensions", [prod.width_cm, prod.depth_cm, prod.height_cm].every(Boolean) ? `${prod.width_cm} × ${prod.depth_cm} × ${prod.height_cm} cm` : "—"],
              ["Materials", prod.materials.join(", ")],
              ["Colours", prod.colors.join(", ")],
              ["Best for", prod.room_types.join(", ")],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="eyebrow">{k}</dt>
                <dd className="mt-1 capitalize">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-8">
            <SaveToDesign productId={prod.id} roomId={null} />
          </div>
        </div>
      </div>
      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="mb-6 text-3xl font-light">Pairs well with</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => (
              <ProductCard key={r.id} product={r} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
