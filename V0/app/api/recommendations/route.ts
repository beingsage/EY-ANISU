// Recommendation endpoint
import { recommendationAgent } from "@/lib/services/worker-agents/recommendation-agent"

export async function POST(request: Request) {
  const { user_id, session_id, context } = await request.json()

  if (!session_id) {
    return Response.json({ error: "Missing session_id" }, { status: 400 })
  }

  try {
    const recommendations = await recommendationAgent.recommend(user_id || null, session_id, context)
    return Response.json({ recommendations, count: recommendations.length })
  } catch (error) {
    return Response.json({ error: "Failed to generate recommendations" }, { status: 500 })
  }
}
