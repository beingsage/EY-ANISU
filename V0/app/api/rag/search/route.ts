// Advanced RAG search with filters
import { ragLayer } from "@/lib/services/rag-layer"

export async function POST(request: Request) {
  const { query, filters, limit } = await request.json()

  if (!query) {
    return Response.json({ error: "Query required" }, { status: 400 })
  }

  try {
    const results = await ragLayer.search(query, filters)

    return Response.json({
      query,
      results: results.slice(0, limit || 10).map((doc) => ({
        id: doc.id,
        type: doc.type,
        content: doc.content,
        metadata: doc.metadata,
      })),
      count: results.length,
    })
  } catch (error) {
    return Response.json({ error: "Search failed" }, { status: 500 })
  }
}
