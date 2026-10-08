// Session storage for the browser Supabase client.
// Returns localStorage in the browser and memory/no storage during SSR.
export function brokeredPreviewStorage() {
  if (typeof window === "undefined") return undefined;
  return localStorage;
}
