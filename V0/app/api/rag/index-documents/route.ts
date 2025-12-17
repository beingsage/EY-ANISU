// Document indexing endpoint for ETL pipeline
import { ragLayer } from "@/lib/services/rag-layer"

export async function POST(request: Request) {
  const { documents } = await request.json()

  if (!Array.isArray(documents)) {
    return Response.json({ error: "Documents must be an array" }, { status: 400 })
  }

  try {
    let indexed = 0
    for (const doc of documents) {
      ragLayer.addDocument(doc)
      indexed++
    }

    return Response.json({
      indexed,
      total: documents.length,
      message: `Successfully indexed ${indexed} documents`,
    })
  } catch (error) {
    return Response.json({ error: "Indexing failed" }, { status: 500 })
  }
}
