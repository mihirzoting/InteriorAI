## InteriorAI architecture
- AI capabilities live behind interfaces in `src/services/ai/types.ts` (RoomAnalyzer, ObjectDetector, ImageEmbedder, RecommendationRanker); pages consume only these — so external AI services can be swapped in without UI changes.
- Never fabricate AI output: unconnected providers return empty results and the UI says so.
- App data reads/writes go through `src/lib/data.ts` using the browser client under RLS — keeps ownership checks in the database.
- The design assistant streams from the `/api/chat` server route, which verifies the bearer token and grounds the model in the live catalogue and the user's rooms.
