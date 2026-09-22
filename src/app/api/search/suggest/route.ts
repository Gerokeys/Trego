import type { NextRequest } from "next/server";
import { getSearchSuggestions } from "@/lib/listing-search";

/** Search-box suggestions: GET /api/search/suggest?q=iph */
export async function GET(request: NextRequest) {
  const suggestions = await getSearchSuggestions(request.nextUrl.searchParams.get("q") ?? "");
  return Response.json(suggestions, {
    // Short-lived: listings change, but someone retyping a word shouldn't refetch.
    headers: { "Cache-Control": "private, max-age=30" },
  });
}
