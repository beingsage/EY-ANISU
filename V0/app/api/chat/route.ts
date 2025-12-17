// Sales Agent chat endpoint
import { sessionManager } from "@/lib/services/session-manager"
import { salesAgent } from "@/lib/services/sales-agent"

export async function POST(request: Request) {
  const { session_id, message, user_id } = await request.json()

  if (!session_id || !message) {
    return Response.json({ error: "Missing required fields" }, { status: 400 })
  }

  try {
    const session = await sessionManager.getSession(session_id)
    if (!session) {
      return Response.json({ error: "Session not found" }, { status: 404 })
    }

    const response = await salesAgent.processMessage(session_id, message)
    const updatedSession = await sessionManager.getSession(session_id)

    return Response.json({
      session_id,
      agent_response: response,
      cart: updatedSession?.context.cart_items || [],
      timestamp: Date.now(),
    })
  } catch (error) {
    console.error("Chat error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
