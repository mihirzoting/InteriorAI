/**
 * Service contracts for InteriorAI's intelligence layer.
 * Each interface can be backed by an external AI service later
 * (vision model, object detector, embedding store, LLM re-ranker)
 * without touching the pages that consume it.
 */
import type { Product } from "@/lib/catalog";

export type DetectedColor = { hex: string; name: string; share: number };

export type DetectedObject = { label: string; confidence: number };

export type RoomAnalysis = {
  version: 1;
  analyzedAt: string;
  width: number;
  height: number;
  orientation: "landscape" | "portrait" | "square";
  palette: DetectedColor[];
  brightness: number; // 0-1
  warmth: number; // -1 cool .. 1 warm
  saturation: number; // 0-1
  contrast: number; // 0-1
  lighting: "dim" | "balanced" | "bright";
  tone: "cool" | "neutral" | "warm";
  /** Filled by an object-detection provider. Empty when none is connected. */
  objects: DetectedObject[];
  providers: { colors: string; objects: string | null; embeddings: string | null };
};

export interface RoomAnalyzer {
  readonly id: string;
  analyze(image: Blob): Promise<RoomAnalysis>;
}

export interface ObjectDetector {
  readonly id: string;
  detect(image: Blob): Promise<DetectedObject[]>;
}

export interface ImageEmbedder {
  readonly id: string;
  embed(image: Blob): Promise<number[]>;
}

export type PreferenceInput = {
  roomType: string;
  style: string;
  budget: number | null;
  colors: string[];
  widthM: number | null;
  lengthM: number | null;
  requirements: string;
};

export type FeedbackSignal = { productId: string; rating: 1 | -1; category: string; style: string };

export type ScoredProduct = { product: Product; score: number; reasons: string[] };

export interface RecommendationRanker {
  readonly id: string;
  rank(input: {
    products: Product[];
    preferences: PreferenceInput;
    analysis: RoomAnalysis | null;
    feedback: FeedbackSignal[];
  }): ScoredProduct[];
}
