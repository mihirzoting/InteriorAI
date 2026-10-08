import { supabase } from "@/integrations/supabase/client";
import type { Product } from "./catalog";
import type { RoomAnalysis, FeedbackSignal, PreferenceInput } from "@/services/ai/types";
import { metadataRanker } from "@/services/ai/recommender";
import { requireUserId } from "./auth";

export type Room = {
  id: string;
  name: string;
  room_type: string;
  image_path: string | null;
  analysis: RoomAnalysis | null;
  created_at: string;
};

export type Prefs = {
  style: string;
  budget: number | null;
  colors: string[];
  width_m: number | null;
  length_m: number | null;
  height_m: number | null;
  requirements: string | null;
};

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export async function listProducts(): Promise<Product[]> {
  return check(await supabase.from("products").select("*").order("name")) as Product[];
}

export async function getProduct(id: string): Promise<Product> {
  return check(await supabase.from("products").select("*").eq("id", id).single()) as Product;
}

export async function listRooms(): Promise<Room[]> {
  return check(await supabase.from("rooms").select("*").order("created_at", { ascending: false })) as unknown as Room[];
}

export async function getRoom(id: string): Promise<Room> {
  return check(await supabase.from("rooms").select("*").eq("id", id).single()) as unknown as Room;
}

export async function signedUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from("room-photos").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export async function createRoom(file: File, roomType: string, name: string): Promise<string> {
  const uid = await requireUserId();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${uid}/${crypto.randomUUID()}.${ext}`;
  const up = await supabase.storage.from("room-photos").upload(path, file, { contentType: file.type });
  if (up.error) throw new Error(up.error.message);
  const row = check(
    await supabase.from("rooms").insert({ user_id: uid, room_type: roomType, name, image_path: path }).select("id").single(),
  );
  return row!.id;
}

export async function saveAnalysis(roomId: string, analysis: RoomAnalysis) {
  check(await supabase.from("rooms").update({ analysis: analysis as never }).eq("id", roomId));
}

export async function deleteRoom(room: Room) {
  if (room.image_path) await supabase.storage.from("room-photos").remove([room.image_path]);
  check(await supabase.from("rooms").delete().eq("id", room.id));
}

export async function getPrefs(roomId: string): Promise<Prefs | null> {
  return check(await supabase.from("room_preferences").select("*").eq("room_id", roomId).maybeSingle()) as Prefs | null;
}

export async function savePrefs(roomId: string, p: Prefs) {
  const uid = await requireUserId();
  check(
    await supabase
      .from("room_preferences")
      .upsert({ ...p, room_id: roomId, user_id: uid, updated_at: new Date().toISOString() }, { onConflict: "room_id" }),
  );
}

export type Rec = { id: string; score: number; reasons: string[]; product: Product };

export async function listRecommendations(roomId: string): Promise<Rec[]> {
  const rows = check(
    await supabase
      .from("recommendations")
      .select("id, score, reasons, product:products(*)")
      .eq("room_id", roomId)
      .order("score", { ascending: false }),
  );
  return rows as unknown as Rec[];
}

/** Runs the ranker over the catalog and persists the top results for this room. */
export async function generateRecommendations(roomId: string) {
  const uid = await requireUserId();
  const [room, prefs, products, fb] = await Promise.all([
    getRoom(roomId),
    getPrefs(roomId),
    listProducts(),
    supabase.from("feedback").select("product_id, rating, product:products(category, style)").eq("user_id", uid),
  ]);
  if (!prefs) throw new Error("Set your preferences first");
  const feedback: FeedbackSignal[] = (fb.data ?? []).map((f) => {
    const prod = f.product as unknown as { category: string; style: string } | null;
    return { productId: f.product_id, rating: f.rating > 0 ? 1 : -1, category: prod?.category ?? "", style: prod?.style ?? "" };
  });
  const input: PreferenceInput = {
    roomType: room.room_type,
    style: prefs.style,
    budget: prefs.budget,
    colors: prefs.colors,
    widthM: prefs.width_m,
    lengthM: prefs.length_m,
    requirements: prefs.requirements ?? "",
  };
  const ranked = metadataRanker.rank({ products, preferences: input, analysis: room.analysis, feedback }).slice(0, 12);
  check(await supabase.from("recommendations").delete().eq("room_id", roomId));
  if (ranked.length) {
    check(
      await supabase.from("recommendations").insert(
        ranked.map((r) => ({ room_id: roomId, user_id: uid, product_id: r.product.id, score: r.score, reasons: r.reasons })),
      ),
    );
  }
}

export async function myFeedback(roomId?: string) {
  let q = supabase.from("feedback").select("product_id, rating, room_id");
  if (roomId) q = q.eq("room_id", roomId);
  return check(await q);
}

export async function giveFeedback(productId: string, roomId: string | null, rating: 1 | -1) {
  const uid = await requireUserId();
  const existing = await supabase
    .from("feedback")
    .select("id")
    .eq("product_id", productId)
    .eq("user_id", uid)
    .filter("room_id", roomId ? "eq" : "is", roomId ?? null)
    .maybeSingle();
  if (existing.data) {
    check(await supabase.from("feedback").update({ rating }).eq("id", existing.data.id));
  } else {
    check(await supabase.from("feedback").insert({ user_id: uid, product_id: productId, room_id: roomId, rating }));
  }
}

export type Design = {
  id: string;
  name: string;
  notes: string | null;
  room_id: string | null;
  created_at: string;
  design_items: { id: string; product: Product }[];
};

export async function listDesigns(): Promise<Design[]> {
  const rows = check(
    await supabase
      .from("designs")
      .select("id, name, notes, room_id, created_at, design_items(id, product:products(*))")
      .order("created_at", { ascending: false }),
  );
  return rows as unknown as Design[];
}

export async function createDesign(name: string, roomId: string | null): Promise<string> {
  const uid = await requireUserId();
  const row = check(await supabase.from("designs").insert({ name, user_id: uid, room_id: roomId }).select("id").single());
  return row!.id;
}

export async function addToDesign(designId: string, productId: string) {
  const uid = await requireUserId();
  const res = await supabase.from("design_items").insert({ design_id: designId, product_id: productId, user_id: uid });
  if (res.error && !res.error.message.includes("duplicate")) throw new Error(res.error.message);
}

export async function removeDesignItem(id: string) {
  check(await supabase.from("design_items").delete().eq("id", id));
}

export async function deleteDesign(id: string) {
  check(await supabase.from("designs").delete().eq("id", id));
}
