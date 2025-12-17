// Session management endpoints
import { sessionManager } from "@/lib/services/session-manager"
import type { ChannelType } from "@/lib/types"

export async function POST(request: Request) {
  const { channel, user_id, store_id } = await request.json()

  if (!channel) {
    return Response.json({ error: "Missing channel" }, { status: 400 })
  }

  try {
    const session = await sessionManager.createSession(channel as ChannelType, user_id, store_id)
    return Response.json(session, { status: 201 })
  } catch (error) {
    return Response.json({ error: "Failed to create session" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get("session_id")

  if (!sessionId) {
    return Response.json({ error: "Missing session_id" }, { status: 400 })
  }

  try {
    const session = await sessionManager.getSession(sessionId)
    if (!session) {
      return Response.json({ error: "Session not found" }, { status: 404 })
    }
    return Response.json(session)
  } catch (error) {
    return Response.json({ error: "Failed to fetch session" }, { status: 500 })
  }
}
