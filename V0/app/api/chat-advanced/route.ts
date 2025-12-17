// Advanced chat endpoint with tool calling
import { advancedSalesAgent } from "@/lib/services/sales-agent-advanced"
import { sessionManager } from "@/lib/services/session-manager"

export async function POST(request: Request) {
  const { session_id, message } = await request.json()

  if (!session_id || !message) {
    return Response.json({ error: "Missing required fields" }, { status: 400 })
  }

  try {
    const response = await advancedSalesAgent.processMessageWithToolCalling(session_id, message)
    const session = await sessionManager.getSession(session_id)

    return Response.json({
      session_id,
      message: response,
      cart: session?.context.cart_items || [],
      timestamp: Date.now(),
    })
  } catch (error) {
    console.error("Chat error:", error)
    return Response.json({ error: "Chat processing failed" }, { status: 500 })
  }
}
