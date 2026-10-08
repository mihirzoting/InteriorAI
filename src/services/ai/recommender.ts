import type { RecommendationRanker, ScoredProduct } from "./types";

const ADJACENT: Record<string, string[]> = {
  Modern: ["Minimalist", "Luxury"],
  Minimalist: ["Scandinavian", "Modern"],
  Scandinavian: ["Minimalist", "Bohemian"],
  Industrial: ["Modern"],
  Luxury: ["Modern"],
  Bohemian: ["Scandinavian"],
};

// Rough share of a total room budget a single piece of each category should take.
const BUDGET_SHARE: Record<string, number> = {
  Sofa: 0.45, Bed: 0.4, Table: 0.3, Desk: 0.3, Storage: 0.25, Chair: 0.2,
  Rug: 0.15, Lighting: 0.1, Decor: 0.08, Plant: 0.06,
};

const NEUTRALS = new Set(["white", "cream", "beige", "natural", "grey", "black", "brown"]);

/** Transparent, explainable metadata scorer. Replaceable by an embedding / LLM re-ranker. */
export const metadataRanker: RecommendationRanker = {
  id: "metadata-v1",
  rank({ products, preferences: p, analysis, feedback }) {
    const disliked = new Set(feedback.filter((f) => f.rating < 0).map((f) => f.productId));
    const likedStyles = new Set(feedback.filter((f) => f.rating > 0).map((f) => f.style));
    const likedCats = new Set(feedback.filter((f) => f.rating > 0).map((f) => f.category));
    const roomPalette = (analysis?.palette ?? []).filter((c) => c.share > 0.08).map((c) => c.name);
    const reqWords = p.requirements
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter((w) => w.length > 3);

    const out: ScoredProduct[] = [];
    for (const prod of products) {
      if (disliked.has(prod.id)) continue;
      let score = 0;
      const reasons: string[] = [];

      if (prod.room_types.includes(p.roomType)) {
        score += 30;
        reasons.push(`Designed for a ${p.roomType.toLowerCase()}`);
      } else if (prod.category === "Decor" || prod.category === "Plant" || prod.category === "Lighting") {
        score += 10;
      } else continue;

      if (prod.style === p.style) {
        score += 25;
        reasons.push(`Matches your ${p.style} style`);
      } else if (ADJACENT[p.style]?.includes(prod.style)) {
        score += 10;
        reasons.push(`${prod.style} pairs well with ${p.style}`);
      }

      const prefHits = prod.colors.filter((c) => p.colors.includes(c));
      if (prefHits.length) {
        score += Math.min(15, prefHits.length * 8);
        reasons.push(`In your preferred ${prefHits.join(" & ")}`);
      }

      const roomHits = prod.colors.filter((c) => roomPalette.includes(c));
      if (roomHits.length) {
        score += 10;
        reasons.push(`Echoes the ${roomHits.join(" & ")} already in your room`);
      } else if (analysis && prod.colors.some((c) => NEUTRALS.has(c))) {
        score += 4;
      }
      if (analysis?.lighting === "dim" && prod.category === "Lighting") {
        score += 8;
        reasons.push("Your photo reads dim — extra light will help");
      }

      if (p.budget && p.budget > 0) {
        const cap = p.budget * (BUDGET_SHARE[prod.category] ?? 0.2);
        if (prod.price <= cap) {
          score += 10;
          reasons.push("Fits comfortably in your budget");
        } else if (prod.price <= p.budget) {
          score += 2;
        } else {
          score -= 25;
        }
      }

      if (p.widthM && prod.width_cm && prod.width_cm > p.widthM * 100 * 0.7) {
        score -= 15;
      } else if (p.widthM && prod.width_cm && prod.width_cm > 60) {
        score += 3;
        reasons.push(`Sized for a ${p.widthM}m wide room`);
      }

      const hay = [prod.name, prod.description, prod.category, ...prod.tags, ...prod.materials].join(" ").toLowerCase();
      const reqHits = reqWords.filter((w) => hay.includes(w.replace(/s$/, "")));
      if (reqHits.length) {
        score += Math.min(12, reqHits.length * 6);
        reasons.push(`Addresses “${reqHits.slice(0, 2).join(", ")}”`);
      }

      if (likedStyles.has(prod.style)) score += 4;
      if (likedCats.has(prod.category)) score += 3;

      out.push({ product: prod, score: Math.max(0, Math.min(100, Math.round(score))), reasons });
    }
    return out.sort((a, b) => b.score - a.score);
  },
};
