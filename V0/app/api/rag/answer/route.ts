// RAG question answering endpoint
import { ragLayer } from "@/lib/services/rag-layer"

export async function POST(request: Request) {
  const { question } = await request.json()

  if (!question) {
    return Response.json({ error: "Missing question" }, { status: 400 })
  }

  try {
    const answer = await ragLayer.answerQuestion(question)
    return Response.json({
      question,
      answer: answer.answer,
      confidence: answer.confidence,
      sources: answer.sources.map((doc) => ({
        id: doc.id,
        type: doc.type,
        content: doc.content,
      })),
    })
  } catch (error) {
    return Response.json({ error: "Failed to answer question" }, { status: 500 })
  }
}
