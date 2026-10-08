import { Link } from "@tanstack/react-router";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { formatPrice, productImage, type Product } from "@/lib/catalog";
import { SaveToDesign } from "./SaveToDesign";
import { cn } from "@/lib/utils";

type Props = {
  product: Product;
  score?: number;
  reasons?: string[];
  rating?: number | null;
  onFeedback?: (r: 1 | -1) => void;
  roomId?: string | null;
};

export function ProductCard({ product, score, reasons, rating, onFeedback, roomId }: Props) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border bg-card shadow-soft">
      <Link to="/products/$productId" params={{ productId: product.id }} className="relative block aspect-square overflow-hidden bg-muted">
        <img
          src={productImage(product.image_key)}
          alt={product.name}
          loading="lazy"
          width={816}
          height={816}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        {score !== undefined && (
          <span className="absolute left-3 top-3 rounded-full bg-ink/85 px-3 py-1 text-xs font-semibold text-ink-foreground backdrop-blur">
            {score}% match
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">
              {product.category} · {product.style}
            </p>
            <Link to="/products/$productId" params={{ productId: product.id }}>
              <h3 className="mt-1 text-xl leading-tight hover:text-primary">{product.name}</h3>
            </Link>
          </div>
          <p className="font-display text-lg">{formatPrice(product.price)}</p>
        </div>
        {score !== undefined && (
          <div className="h-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${score}%` }} />
          </div>
        )}
        {reasons && reasons.length > 0 && (
          <ul className="space-y-1 text-sm text-muted-foreground">
            {reasons.slice(0, 3).map((r) => (
              <li key={r} className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-olive" />
                {r}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <SaveToDesign productId={product.id} roomId={roomId ?? null} />
          {onFeedback && (
            <div className="flex gap-1">
              <button
                aria-label="Good recommendation"
                onClick={() => onFeedback(1)}
                className={cn("rounded-full p-2 transition-colors hover:bg-accent", rating === 1 && "bg-accent text-accent-foreground")}
              >
                <ThumbsUp className="h-4 w-4" />
              </button>
              <button
                aria-label="Not for me"
                onClick={() => onFeedback(-1)}
                className={cn("rounded-full p-2 transition-colors hover:bg-secondary", rating === -1 && "bg-secondary text-destructive")}
              >
                <ThumbsDown className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
