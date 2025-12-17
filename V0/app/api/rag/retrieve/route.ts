// RAG retrieval endpoint
import { ragLayer } from "@/lib/services/rag-layer"

export async function POST(request: Request) {
  const { query, top_k, doc_type } = await request.json()

  if (!query) {
    return Response.json({ error: "Missing query" }, { status: 400 })
  }

  try {
    const results = await ragLayer.retrieve(query, top_k || 5, doc_type)
    return Response.json({
      query,
      results: results.map((doc) => ({
        id: doc.id,
        type: doc.type,
        content: doc.content,
        metadata: doc.metadata,
      })),
      count: results.length,
    })
  } catch (error) {
    return Response.json({ error: "RAG retrieval failed" }, { status: 500 })
  }
}
